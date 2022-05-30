import { isString } from "./utils";

export class Page<T> implements IPage<T> {
    data: Array<T>;
    meta: {
        total: number; 
        perPage: number; 
        totalPages: number;
        currentPage: number;
    };

    constructor(data: T[], total: number | string, perPage: number, currentPage: number) {
        const _total: number = this.parseString(total)

        this.data = data;
        this.meta = {
            total: _total,
            perPage: perPage,
            currentPage: currentPage,
            totalPages: Math.ceil(_total / perPage)
        }
    }

    parseString(value: number | string): number {
        if (isString(value)) {
            return parseInt(value as string, 10);
        }
        return value as number;
    }
}

export interface IPage<T> {
    data: Array<T>;
    meta: {
        //itemCount         // how many data elements in current page
        total: number,
        perPage: number,
        totalPages: number,
        currentPage: number
    }
}

export class MyPagination {
    page: number;
    limit: number;

    constructor(page, number) {
        this.page = page
        this.limit = number
    }

    skip() {
        return (this.page - 1) * this.limit;
    }
}