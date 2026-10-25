import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  wrapperClassName?: string;
  hideLabel?: boolean;
}

export function DropdownSelect({
  label,
  options,
  value,
  onChange,
  disabled = false,
  wrapperClassName = "",
  hideLabel = false,
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();
  const activeOptionId = `${listboxId}-option-${activeIndex}`;
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    function updateMenuPosition() {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const spaceBelow = window.innerHeight - bounds.bottom - 12;
      const spaceAbove = bounds.top - 12;
      const showAbove = spaceBelow < 190 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(100, Math.min(280, showAbove ? spaceAbove : spaceBelow));
      setMenuPosition({
        top: showAbove ? Math.max(8, bounds.top - Math.min(280, spaceAbove)) : bounds.bottom + 8,
        left: Math.max(8, Math.min(bounds.left, window.innerWidth - bounds.width - 8)),
        width: bounds.width,
        maxHeight,
      });
    }
    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node
        && !rootRef.current?.contains(event.target)
        && !menuRef.current?.contains(event.target)) setOpen(false);
    }
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [open]);

  function showOptions() {
    const selectedIndex = options.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled || options.length === 0) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        showOptions();
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + direction + options.length) % options.length);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && !open) {
      event.preventDefault();
      showOptions();
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      selectOption(activeIndex);
    }
  }

  return (
    <div className={`module-field ${wrapperClassName}`.trim()}>
      <span className={hideLabel ? "visually-hidden" : undefined}>{label}</span>
      <div className="modern-select" ref={rootRef}>
        <button
          aria-activedescendant={open ? activeOptionId : undefined}
          aria-controls={open ? listboxId : undefined}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={label}
          className="modern-select-trigger"
          disabled={disabled || options.length === 0}
          onClick={() => open ? setOpen(false) : showOptions()}
          onKeyDown={handleKeyDown}
          ref={triggerRef}
          role="combobox"
          type="button"
        >
          <span>{selectedOption?.label ?? `No ${label.toLowerCase()} available`}</span>
          <i aria-hidden="true" className="modern-select-chevron" />
        </button>
        {open && menuPosition && createPortal(
          <ul
            className="modern-select-menu"
            id={listboxId}
            ref={menuRef}
            role="listbox"
            aria-label={label}
              style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
          >
            {options.map((option, index) => (
              <li
                aria-selected={option.value === value}
                className={`modern-select-option${activeIndex === index ? " is-active" : ""}${option.value === value ? " is-selected" : ""}`}
                id={`${listboxId}-option-${index}`}
                key={option.value}
                onClick={() => selectOption(index)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
              >
                <span>{option.label}</span>
                {option.value === value && <span aria-hidden="true" className="modern-select-check">✓</span>}
              </li>
            ))}
          </ul>,
          rootRef.current?.closest(".workspace") ?? document.body,
        )}
      </div>
    </div>
  );
}
