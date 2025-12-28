// Checkbox component
// Custom styled checkbox with optional label

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string | undefined;
  description?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
}: CheckboxProps) {
  const id = label ? `checkbox-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined;

  return (
    <label
      className={`flex items-start gap-3 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
      htmlFor={id}
    >
      <div className="relative flex items-center pt-0.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            onChange(e.target.checked);
          }}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
            checked ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white'
          } ${!disabled && !checked ? 'hover:border-green-400' : ''}`}
        >
          {checked && (
            <svg
              className="h-3.5 w-3.5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
      {(label ?? description) && (
        <div className="flex-1">
          {label && (
            <span
              className={`text-sm font-medium ${
                checked ? 'text-gray-400 line-through' : 'text-gray-900'
              }`}
            >
              {label}
            </span>
          )}
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      )}
    </label>
  );
}
