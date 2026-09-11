export class AppError extends Error {
	public statusCode: number;
	public errors?: Array<{ field?: string; message: string }>;

	constructor(
		statusCode: number,
		message: string,
		stack = "",
		errors?: Array<{ field?: string; message: string }>,
	) {
		super(message); // throw new Error(message)

		this.statusCode = statusCode;
		this.errors = errors;

		if (stack) {
			this.stack = stack;
		} else {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}
