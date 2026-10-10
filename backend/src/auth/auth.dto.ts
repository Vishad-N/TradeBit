import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PHONE_MESSAGE, PHONE_PATTERN } from '../common-phone';

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsEmail() @MaxLength(160) email: string;
  // One of the offered country codes followed by exactly 10 digits.
  @IsString() @Matches(PHONE_PATTERN, { message: PHONE_MESSAGE }) phone: string;
  @IsString() @MinLength(8) @MaxLength(100) password: string;
}

export class LoginDto {
  @IsEmail() @MaxLength(160) email: string;
  @IsString() @MinLength(1) @MaxLength(100) password: string;
}
