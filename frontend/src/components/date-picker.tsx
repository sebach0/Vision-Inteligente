"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function formatDate(date: Date | undefined | null): string {
  if (!date) {
    return "";
  }

  // Formato más simple para el input: DD/MM/YYYY
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false;
  }
  return !isNaN(date.getTime());
}

interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  disableDate?: (date: Date) => boolean;
  // Rango de años para el selector (si no se proveen, se derivan de min/max o 1900..hoy+50)
  fromYear?: number;
  toYear?: number;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  label,
  id,
  disabled = false,
  required = false,
  className = "",
  minDate,
  maxDate,
  disableDate,
  fromYear,
  toYear,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(value || undefined);
  const [month, setMonth] = React.useState<Date | undefined>(date);
  const [inputValue, setInputValue] = React.useState(
    formatDate(value || undefined)
  );

  // Sincronizar con el valor externo
  React.useEffect(() => {
    setDate(value || undefined);
    setInputValue(formatDate(value || undefined));
    setMonth(value || undefined);
  }, [value]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setInputValue(formatDate(selectedDate));
    setOpen(false);
    onChange?.(selectedDate || null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setInputValue(inputValue);

    // Intentar parsear la fecha en diferentes formatos
    let inputDate: Date | undefined;

    // Formato DD/MM/YYYY
    const ddmmyyyy = inputValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      inputDate = new Date(
        parseInt(year || "0"),
        parseInt(month || "1") - 1,
        parseInt(day || "1")
      );
    }
    // Formato YYYY-MM-DD
    else if (inputValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      inputDate = new Date(inputValue);
    }
    // Formato estándar
    else {
      inputDate = new Date(inputValue);
    }

    if (isValidDate(inputDate)) {
      setDate(inputDate);
      setMonth(inputDate);
      onChange?.(inputDate);
    } else if (inputValue === "") {
      setDate(undefined);
      setMonth(undefined);
      onChange?.(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {label && (
        <Label htmlFor={id} className="px-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="relative flex gap-2">
        <Input
          id={id}
          value={inputValue || ""}
          placeholder={placeholder || "DD/MM/YYYY"}
          className="bg-background pr-10"
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          required={required}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
              disabled={disabled}
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Seleccionar fecha</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              fromYear={fromYear ?? 1900}
              toYear={toYear ?? new Date().getFullYear() + 50}
              {...(minDate && { fromDate: minDate })}
              {...(maxDate && { toDate: maxDate })}
              month={month || new Date()}
              onMonthChange={setMonth}
              onSelect={handleDateSelect}
              disabled={(d) => {
                const min = minDate ?? new Date("1900-01-01");
                const isBeforeMin = d < min;
                const isAfterMax = maxDate ? d > maxDate : false;
                const isCustomDisabled = disableDate ? disableDate(d) : false;
                return isBeforeMin || isAfterMax || isCustomDisabled;
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

interface DatePickerWithRangeProps {
  value?: { from: Date | undefined; to: Date | undefined };
  onChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  disableDate?: (date: Date) => boolean;
  fromYear?: number;
  toYear?: number;
}

export function DatePickerWithRange({
  value,
  onChange,
  placeholder = "Seleccionar rango de fechas",
  label,
  id,
  disabled = false,
  required = false,
  className = "",
  minDate,
  maxDate,
  disableDate,
  fromYear,
  toYear,
}: DatePickerWithRangeProps) {
  const [open, setOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>(value || { from: undefined, to: undefined });
  const [month, setMonth] = React.useState<Date | undefined>(dateRange.from);
  const [inputValue, setInputValue] = React.useState(() => {
    if (dateRange.from && dateRange.to) {
      return `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`;
    } else if (dateRange.from) {
      return formatDate(dateRange.from);
    }
    return "";
  });

  // Sincronizar con el valor externo
  React.useEffect(() => {
    setDateRange(value || { from: undefined, to: undefined });
    if (value?.from && value?.to) {
      setInputValue(`${formatDate(value.from)} - ${formatDate(value.to)}`);
    } else if (value?.from) {
      setInputValue(formatDate(value.from));
    } else {
      setInputValue("");
    }
    setMonth(value?.from || undefined);
  }, [value]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;

    let newRange = { ...dateRange };

    if (!dateRange.from || (dateRange.from && dateRange.to)) {
      // Seleccionar fecha inicial
      newRange = { from: selectedDate, to: undefined };
    } else if (dateRange.from && !dateRange.to) {
      // Seleccionar fecha final
      if (selectedDate < dateRange.from) {
        // Si la fecha seleccionada es anterior a la inicial, intercambiar
        newRange = { from: selectedDate, to: dateRange.from };
      } else {
        newRange = { from: dateRange.from, to: selectedDate };
      }
      setOpen(false);
    }

    setDateRange(newRange);
    setInputValue(
      newRange.from && newRange.to
        ? `${formatDate(newRange.from)} - ${formatDate(newRange.to)}`
        : newRange.from
        ? formatDate(newRange.from)
        : ""
    );
    onChange?.(newRange);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setInputValue(inputValue);

    // Si el input está vacío, limpiar el rango
    if (inputValue === "") {
      const newRange = { from: undefined, to: undefined };
      setDateRange(newRange);
      onChange?.(newRange);
      return;
    }

    // Intentar parsear rango de fechas (formato: DD/MM/YYYY - DD/MM/YYYY)
    const rangeMatch = inputValue.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );
    if (rangeMatch) {
      const [, day1, month1, year1, day2, month2, year2] = rangeMatch;
      const fromDate = new Date(
        parseInt(year1),
        parseInt(month1) - 1,
        parseInt(day1)
      );
      const toDate = new Date(
        parseInt(year2),
        parseInt(month2) - 1,
        parseInt(day2)
      );

      if (isValidDate(fromDate) && isValidDate(toDate)) {
        const newRange = { from: fromDate, to: toDate };
        setDateRange(newRange);
        setMonth(fromDate);
        onChange?.(newRange);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {label && (
        <Label htmlFor={id} className="px-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="relative flex gap-2">
        <Input
          id={id}
          value={inputValue || ""}
          placeholder={placeholder || "DD/MM/YYYY - DD/MM/YYYY"}
          className="bg-background pr-10"
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          required={required}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
              disabled={disabled}
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Seleccionar rango de fechas</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="range"
              selected={dateRange}
              captionLayout="dropdown"
              fromYear={fromYear ?? 1900}
              toYear={toYear ?? new Date().getFullYear() + 50}
              {...(minDate && { fromDate: minDate })}
              {...(maxDate && { toDate: maxDate })}
              month={month || new Date()}
              onMonthChange={setMonth}
              onSelect={(range) => {
                if (range) {
                  handleDateSelect(range.from);
                }
              }}
              disabled={(d) => {
                const min = minDate ?? new Date("1900-01-01");
                const isBeforeMin = d < min;
                const isAfterMax = maxDate ? d > maxDate : false;
                const isCustomDisabled = disableDate ? disableDate(d) : false;
                return isBeforeMin || isAfterMax || isCustomDisabled;
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
