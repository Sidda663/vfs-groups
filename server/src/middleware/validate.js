import { ApiError } from '../utils/apiError.js';

export const validate = (schema, source = 'body') => (request, _response, next) => {
  const result = schema.safeParse(request[source]);
  if (!result.success) {
    const fields = Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
    return next(new ApiError(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', fields));
  }
  request[source] = result.data;
  next();
};
