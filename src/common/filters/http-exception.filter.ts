import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

function prismaKnownMessage(error: Prisma.PrismaClientKnownRequestError): { status: number; message: string } {
  switch (error.code) {
    case 'P2002': {
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target.join(', ') : String(target ?? 'value');
      return {
        status: HttpStatus.CONFLICT,
        message: `A record with this ${fields} already exists. Use a different value or update the existing record.`,
      };
    }
    case 'P2025':
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'The record was not found or was already deleted.',
      };
    case 'P2003':
      return {
        status: HttpStatus.BAD_REQUEST,
        message:
          'This change conflicts with related data (for example, a room type still has rooms assigned). Remove or reassign dependent records first.',
      };
    case 'P2014':
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'The change would break a required relation between records.',
      };
    case 'P2022': {
      const column = error.meta?.column;
      const modelName = error.meta?.modelName;
      const detail =
        column != null && modelName != null
          ? ` Missing column "${String(column)}" on ${String(modelName)}.`
          : ' ';
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `The database schema is out of date.${detail}Run \`npx prisma db push\` (dev) or \`npx prisma migrate deploy\` (prod) against this DATABASE_URL, then restart the server.`,
      };
    }
    default:
      return {
        status: HttpStatus.BAD_REQUEST,
        message: `Database could not complete this operation (${error.code}). Check your input and try again.`,
      };
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Something went wrong. Please try again.';
    let errorLabel = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        errorLabel = exception.name.replace(/Exception$/, '') || 'Error';
      } else if (typeof body === 'object' && body !== null) {
        const b = body as { message?: string | string[]; error?: string };
        if (b.message !== undefined) {
          message = b.message;
        }
        if (typeof b.error === 'string') {
          errorLabel = b.error;
        } else {
          errorLabel = exception.name.replace(/Exception$/, '') || 'Error';
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = prismaKnownMessage(exception);
      status = mapped.status;
      message = mapped.message;
      errorLabel =
        status === HttpStatus.CONFLICT
          ? 'Conflict'
          : status === HttpStatus.NOT_FOUND
            ? 'Not Found'
            : status === HttpStatus.INTERNAL_SERVER_ERROR
              ? 'Internal Server Error'
              : 'Bad Request';
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data format (for example, a bad ID or number). Check your request and try again.';
      errorLabel = 'Bad Request';
    } else if (exception instanceof Error) {
      this.logger.error(`${request.method} ${request.url} — ${exception.message}`, exception.stack);
      message = 'An unexpected error occurred. Please try again later.';
      errorLabel = 'Internal Server Error';
    }

    const payload: Record<string, unknown> = {
      statusCode: status,
      error: errorLabel,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(payload);
  }
}
