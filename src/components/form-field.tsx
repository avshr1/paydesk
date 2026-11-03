type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  errors?: string[];
  multiline?: boolean;
};

export function FormField({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  errors,
  multiline = false,
}: FormFieldProps) {
  const errorId = `${name}-error`;
  const hasError = Boolean(errors?.length);
  const inputProps = {
    id: name,
    name,
    defaultValue,
    "aria-invalid": hasError,
    "aria-describedby": hasError ? errorId : undefined,
    className:
      "rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-invalid:border-red-500 dark:border-zinc-700 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10",
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea {...inputProps} rows={3} />
      ) : (
        <input {...inputProps} type={type} autoComplete={autoComplete} />
      )}
      {hasError && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400">
          {errors?.[0]}
        </p>
      )}
    </div>
  );
}
