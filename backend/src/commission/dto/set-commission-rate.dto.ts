import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class SetCommissionRateDto {
  @ApiProperty({ example: 2, description: 'Level 2-10 (Level 1 = self, never configurable)' })
  @IsInt()
  @Min(2)
  @Max(10)
  level: number;

  @ApiProperty({ example: 10.0, description: 'Percentage, e.g. 10.0 for 10%' })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}
