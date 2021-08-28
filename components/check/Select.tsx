import { styled } from "@material-ui/core/styles";
import { ChangeEvent, DetailedHTMLProps, SelectHTMLAttributes } from "react";

export type SelectProps = DetailedHTMLProps<
  SelectHTMLAttributes<HTMLSelectElement>,
  HTMLSelectElement
> & {
  options: string[];
};

export const Select = styled(({ className, defaultValue, options, ...props }: SelectProps) => {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    e.target.dataset.value = e.target.selectedIndex.toString();
    if (typeof props.onChange === "function") {
      props.onChange(e);
    }
  };

  return (
    <select
      {...props}
      className={`Select-root ${className}`}
      data-value={defaultValue}
      defaultValue={defaultValue}
      onChange={handleChange}
    >
      {options.map((option, index) => (
        <option className="Select-option" key={index} value={index}>
          {option}
        </option>
      ))}
    </select>
  );
})`
  ${({ theme }) => `
    appearance: none;
    background: none;
    border: 0;
    font: inherit;
    height: 100%;
    min-width: 100%; // Required for dynamic name resizing
    padding: ${theme.spacing(0, 2)};
    text-align: inherit;

    &:disabled {
      color: ${theme.palette.action.disabled};
      opacity: 1;
    }

    &:focus-visible {
      outline: 2px solid ${theme.palette.primary.main};
    }

    &:not(:disabled) {
      color: currentColor;
      cursor: pointer;
    }

    & .Select-option {
      background: ${theme.palette.background.paper};
    }
  `}
`;