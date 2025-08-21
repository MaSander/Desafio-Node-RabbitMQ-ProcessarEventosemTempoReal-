/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsObject()
  @IsOptional()
  eventData?: any;

  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
