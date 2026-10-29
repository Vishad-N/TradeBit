import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type TgUpdate = { update_id: number; message?: { text?: string; chat: { id: number }; from?: { id: number; username?: string } } };

/**
 * The enrolment Telegram bot. It links a site account to a Telegram account (deep link t.me/<bot>?start=<token>)
 * and then asks Telegram whether that account is in the channel, so a free request is only queued for people who joined.
 * Needs TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME and TELEGRAM_CHANNEL_ID, and the bot must be an admin of the channel
 * (Telegram only lets admins read a channel's member list). Without them the feature is off and enrolment works as before.
 */
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('TelegramBot');
  private polling = false;

  constructor(private readonly prisma: PrismaService) {}

  // Read per call so the keys can be added to .env without a code change.
  private cfg() {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const username = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, '');
    const channel = process.env.TELEGRAM_CHANNEL_ID?.trim();
    return token && username && channel ? { token, username, channel } : null;
  }
  get enabled() { return !!this.cfg(); }

  private async call<T = any>(method: string, body: Record<string, unknown> = {}): Promise<T> {
    const c = this.cfg();
    if (!c) throw new ServiceUnavailableException('Telegram is not set up.');
    const res = await fetch(`https://api.telegram.org/bot${c.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) throw new Error(`Telegram ${method}: ${json.description || res.status}`);
    return json.result as T;
  }

  // ---------- lifecycle: webhook when a public URL is configured, long polling otherwise (local dev)
  async onModuleInit() {
    if (!this.enabled) return;
    const hook = process.env.TELEGRAM_WEBHOOK_URL?.trim();
    try {
      if (hook) {
        await this.call('setWebhook', { url: hook, secret_token: process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || undefined, allowed_updates: ['message'] });
        this.log.log('Webhook registered');
      } else {
        await this.call('deleteWebhook');
        this.polling = true;
        void this.poll();
        this.log.log('Long polling started (set TELEGRAM_WEBHOOK_URL in production)');
      }
    } catch (e) {
      this.log.error((e as Error).message);
    }
  }
  onModuleDestroy() { this.polling = false; }

  private async poll() {
    let offset = 0;
    while (this.polling) {
      try {
        const updates = await this.call<TgUpdate[]>('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] });
        for (const u of updates) {
          offset = u.update_id + 1;
          await this.handleUpdate(u).catch((e) => this.log.error(e.message));
        }
      } catch (e) {
        this.log.warn((e as Error).message);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  // ---------- the bot itself
  async handleUpdate(u: TgUpdate) {
    const m = u.message;
    if (!m?.text || !m.from) return;
    const reply = (text: string) => this.call('sendMessage', { chat_id: m.chat.id, text }).catch((e) => this.log.warn(e.message));
    const match = /^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]{8,64}))?\s*$/.exec(m.text.trim());
    if (!match) return;
    if (!match[1]) return void reply('Hi! Open the enrolment page on our website, press "Join Telegram & enrol free", then use the bot link shown there.');

    const link = await this.prisma.telegramLink.findUnique({ where: { token: match[1] } });
    if (!link) return void reply('This link has expired. Please go back to the website and start again.');
    const tgId = String(m.from.id);
    const taken = await this.prisma.telegramLink.findUnique({ where: { telegramUserId: tgId } });
    if (taken && taken.id !== link.id) return void reply('This Telegram account is already linked to another student account.');
    await this.prisma.telegramLink.update({ where: { id: link.id }, data: { telegramUserId: tgId, username: m.from.username ?? null, linkedAt: new Date() } });
    reply('Linked. Now join our channel, then go back to the website and press "I have joined, continue".');
  }

  // ---------- used by the enrolment flow
  /** The student's link row (created on first use). */
  async linkFor(userId: string) {
    const existing = await this.prisma.telegramLink.findUnique({ where: { userId } });
    return existing ?? this.prisma.telegramLink.create({ data: { userId, token: randomBytes(16).toString('hex') } });
  }

  botUrl(token: string) { return `https://t.me/${this.cfg()!.username}?start=${token}`; }

  /** True when Telegram says this account is in the channel. Fails closed (503) if Telegram cannot be asked. */
  async isMember(telegramUserId: string) {
    try {
      const r = await this.call<{ status: string; is_member?: boolean }>('getChatMember', { chat_id: this.cfg()!.channel, user_id: Number(telegramUserId) });
      return ['creator', 'administrator', 'member'].includes(r.status) || (r.status === 'restricted' && !!r.is_member);
    } catch (e) {
      const msg = (e as Error).message;
      // "user not found" style errors mean not a member; anything else is our setup (bot not an admin, wrong channel id).
      if (/user not found|participant_id_invalid/i.test(msg)) return false;
      this.log.error(`${msg} (is the bot an admin of the channel?)`);
      throw new ServiceUnavailableException('We could not check your Telegram membership right now. Please try again in a moment.');
    }
  }
}
