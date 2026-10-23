import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.service';
import { StorageModule } from './storage/storage.service';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { ReadingModule } from './reading/reading.module';
import { MentorshipModule } from './mentorship/mentorship.module';
import { PlatformsModule } from './platforms/platforms.module';
import { WebinarModule } from './webinar/webinar.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { ProfitShotsModule } from './profit-shots/profit-shots.module';
import { GalleryModule } from './gallery/gallery.module';
import { SiteLinksModule } from './site-links/site-links.module';
import { PricingModule } from './pricing/pricing.module';
import { HealthModule } from './health/health.module';
import { CoursesModule } from './courses/courses.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 240 }]),
    PrismaModule,
    StorageModule,
    AuthModule,
    BooksModule,
    ReadingModule,
    MentorshipModule,
    PlatformsModule,
    WebinarModule,
    TestimonialsModule,
    ProfitShotsModule,
    GalleryModule,
    SiteLinksModule,
    PricingModule,
    HealthModule,
    CoursesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
