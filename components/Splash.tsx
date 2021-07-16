import { Backdrop } from "@material-ui/core";
import { styled } from "@material-ui/core/styles";
import { StyledProps } from "declarations";

interface SplashProps extends StyledProps {
  appear?: boolean;
  open: boolean;
}

export const Splash = styled((props: SplashProps) => {
  return (
    <Backdrop appear={props.appear ?? false} className={props.className} open={props.open}>
      {/* TODO: Add logo */}
      Loading...
    </Backdrop>
  );
})`
  ${({ theme }) => `
    align-items: center;
    background-color: ${theme.palette.background.default};
    display: flex;
    justify-content: center;
    z-index: 2000;
  `}
`;
