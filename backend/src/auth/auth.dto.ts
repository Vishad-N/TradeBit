import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsEmail() @MaxLength(160) email: string;
  @IsString() @MinLength(8) @MaxLength(100) password: string;
}

export class LoginDto {
  @IsEmail() @MaxLength(160) email: string;
  @IsString() @MinLength(1) @MaxLength(100) password: string;
}
