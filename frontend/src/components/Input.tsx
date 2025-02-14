import React from "react";

interface InputProps {
  type: string;
  id?: string;
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: number;
}

const Input: React.FC<InputProps> = ({
  type,
  id,
  placeholder,
  value,
  onChange,
  className,
  min,
}) => {
  return (
    <input
      type={type}
      id={id}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      min={min}
      className={`w-full border p-3 rounded bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    />
  );
};

export default Input;
