import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from './Icons';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
  autoOpen?: boolean;
  onClose?: () => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, placeholder, id, autoOpen = false, onClose }) => {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsOpen(autoOpen);
  }, [autoOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        if(isOpen) {
            setIsOpen(false);
            if (onClose) onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    if (onClose) onClose();
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={selectRef} id={id}>
      <button
        type="button"
        onClick={() => {
            const newIsOpen = !isOpen;
            setIsOpen(newIsOpen);
            if (!newIsOpen && onClose) {
                onClose();
            }
        }}
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? 'text-white' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {isOpen ? <ChevronUpIcon className="h-5 w-5 text-gray-400" /> : <ChevronDownIcon className="h-5 w-5 text-gray-400" />}
      </button>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto" role="listbox">
          <ul className="py-1">
            {options.map(option => (
              <li
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className="px-3 py-2 text-white hover:bg-indigo-600 cursor-pointer"
                role="option"
                aria-selected={value === option.value}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
