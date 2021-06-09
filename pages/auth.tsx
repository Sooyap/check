import { Divider, IconButton, Typography, TypographyProps } from "@material-ui/core";
import { experimentalStyled as styled } from "@material-ui/core/styles";
import { Email, Facebook, Google, VpnKey } from "@material-ui/icons";
import { Link } from "components/Link";
import { ValidateForm, ValidateSubmitButton, ValidateTextField } from "components/ValidateForm";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import { ChangeEvent, ReactNode, useState } from "react";
import { verifyAuthToken } from "services/firebase";
import { useLoading } from "utilities/LoadingContextProvider";
import { useSnackbar } from "utilities/SnackbarContextProvider";

interface DividerTextProps extends TypographyProps {
  children: ReactNode;
  className?: string;
  spacing?: number;
}

interface PageProps {
  className: string;
}

const Page: NextPage<PageProps> = styled((props: PageProps) => {
  const router = useRouter();
  const { loading, setLoading } = useLoading();
  const { setSnackbar } = useSnackbar();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };
  const handleFormSubmit = async () => {
    try {
      setLoading({
        active: true,
        id: "authSubmit",
      });
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      router.events.on("routeChangeComplete", handleRouteChange);
      router.push("/");
    } catch (err) {
      setSnackbar({
        active: true,
        message: err,
        type: "error",
      });
      setLoading({
        active: false,
        id: "authSubmit",
      });
    }
  };
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };
  const handleRouteChange = () => {
    setLoading({ active: false });
    console.log("hey");
    router.events.off("routeChangeComplete", handleRouteChange);
  };

  return (
    <main className={props.className}>
      <ValidateForm className="Auth-root" onSubmit={handleFormSubmit}>
        <Typography className="Auth-title" variant="h1">
          Sign In
        </Typography>
        <DividerText>With a provider</DividerText>
        <div className="Auth-providers">
          <IconButton className="Auth-google">
            <Google />
          </IconButton>
          <IconButton className="Auth-facebook">
            <Facebook />
          </IconButton>
        </div>
        <DividerText>Or by email</DividerText>
        <TextField
          autoComplete="email"
          className="Auth-email"
          disabled={loading.active}
          InputProps={{
            startAdornment: <Email />,
          }}
          label="Email"
          onChange={handleEmailChange}
          type="email"
          value={email}
        />
        <TextField
          autoComplete="current-password"
          className="Auth-password"
          disabled={loading.active}
          InputProps={{
            startAdornment: <VpnKey />,
          }}
          inputProps={{
            minLength: 6,
          }}
          label="Password"
          onChange={handlePasswordChange}
          type="password"
          value={password}
        />
        <ValidateSubmitButton
          className="Auth-submit"
          disabled={loading.active}
          loading={loading.queue.includes("authSubmit")}
          variant="outlined"
        >
          Sign In
        </ValidateSubmitButton>
        <div className="Auth-navigation">
          <Link className="Auth-back" NextLinkProps={{ href: "/" }}>
            Go back
          </Link>
          <Link className="Auth-register" NextLinkProps={{ href: "/register" }}>
            Register
          </Link>
        </div>
        <Link className="Auth-reset" NextLinkProps={{ href: "/resetPassword" }}>
          Forgot your password?
        </Link>
      </ValidateForm>
    </main>
  );
})`
  ${({ theme }) => `
    align-items: center;
    display: flex;
    height: 100vh;
    justify-content: center;
    padding: ${theme.spacing(2)};

    & .Auth-root {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 256px;
      width: 512px;

      & .Auth-email {
        margin-top: ${theme.spacing(2)};
      }

      & .Auth-navigation {
        display: flex;
        justify-content: space-between;
        margin: ${theme.spacing(4, 2, 0)};
      }

      & .Auth-password {
        margin-top: ${theme.spacing(4)};
      }

      & .Auth-providers {
        display: flex;
        justify-content: center;

        & .MuiIconButton-root {
          margin: 0 ${theme.spacing(1)};

          &:before {
            border: 1px solid ${theme.palette.divider};
            border-radius: 50%;
            content: " ";
            height: 100%;
            position: absolute;
            width: 100%;
          }
        }
      }

      & .Auth-reset {
        margin: ${theme.spacing(8, "auto", 0, 2)};
      }

      & .Auth-submit {
        height: 48px;
        margin-top: ${theme.spacing(4)};
      }

      & .Auth-title {
        margin: 0;
        text-align: center;
      }

      & .Divider-root {
        margin: ${theme.spacing(4)} 0;
      }
    }
  `}
`;

const DividerText = styled(({ children, className, spacing, ...props }: DividerTextProps) => (
  <Typography
    className={`${className} Divider-root`}
    component="span"
    variant="subtitle1"
    {...props}
  >
    <Divider />
    <span className="Divider-text">{children}</span>
    <Divider />
  </Typography>
))`
  ${({ spacing = 1, theme }) => `
    align-items: center;
    display: flex;
    width: 100%;

    & .Divider-text {
      color: ${theme.palette.action.disabled};
      flex: 0;
      padding: 0 ${theme.spacing(spacing)};
      white-space: nowrap;
    }

    & .MuiDivider-root {
      flex: 1;
    }
  `}
`;

const TextField = styled(ValidateTextField)`
  ${({ theme }) => `
    & .MuiInputLabel-root {
      margin-left: ${theme.spacing(1)};
    }

    & .MuiInputBase-root.MuiInputBase-adornedStart {
      height: 64px;

      & .MuiInputBase-input {
        border-bottom-left-radius: 0;
        border-top-left-radius: 0;
      }

      & .MuiOutlinedInput-notchedOutline legend {
        margin-left: ${theme.spacing(1)};
      }

      & .MuiSvgIcon-root {
        margin: 0 ${theme.spacing(1)};
      }
    }
  `}
`;

export const getServerSideProps: GetServerSideProps = async (context) => {
  if (context.req.cookies.authToken) {
    await verifyAuthToken(context.req.cookies.authToken);
    return {
      redirect: {
        permanent: false,
        destination: "/",
      },
    };
  } else {
    return {
      props: {},
    };
  }
};

export default Page;
