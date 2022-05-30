import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, Optional } from '@nestjs/common';
import { MyPagination } from '../utils/pagination';

@Injectable()
export class ParsePagePipe implements PipeTransform<any> {
  defaultPage: number = 1
  defaultLimit: number = 5
  maxLimit: number = 100
 
  constructor(@Optional() init?: Partial<{ defaultPage: number, defaultLimit: number, maxLimit: number }>) {     // default values
    this.defaultPage = (init != null && init.defaultPage != null) ? init.defaultPage : this.defaultPage;
    this.defaultLimit = (init != null && init.defaultLimit != null) ? init.defaultLimit : this.defaultLimit;
    this.maxLimit = (init != null && init.maxLimit != null) ? init.maxLimit : this.maxLimit;
  }

  transform(value, metadata: ArgumentMetadata): MyPagination {
    return new MyPagination(
      this.toPage(this.toIntOrNull(value.page)),
      this.toLimit(this.toIntOrNull(value.limit))
    );
  }

  toPage(newPage: number) {
    return (newPage <= 0) ? this.defaultPage : newPage;
  }

  toLimit(newLimit: number) {
    return (newLimit < this.defaultLimit) ? this.defaultLimit
    :
    (
      (newLimit > this.maxLimit) ? this.maxLimit : newLimit
    );
  }

  toIntOrNull(value) {
    if (value == null || value == 0) return 0;
    let x;
    if (!isNaN(value) && (x = parseFloat(value)) && (x | 0) === x) {
      return parseInt(value, 10);
    }
    throw new BadRequestException('Pagination validation failed');
  }
}

