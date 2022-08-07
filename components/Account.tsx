import { IconButton, Menu, MenuItem } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useAuth } from "components/AuthContextProvider";
import { LinkButton, LinkMenuItem, redirect } from "components/Link";
import { useLoading } from "components/LoadingContextProvider";
import { useSnackbar } from "components/SnackbarContextProvider";
import { UserAvatar } from "components/UserAvatar";
import { BaseProps } from "declarations";
import { signOut } from "firebase/auth";
import { MouseEventHandler, useState } from "react";
import { auth } from "services/firebase";

type AccountProps = Pick<BaseProps, "className" | "strings"> & {
  onSignOut?: () => void;
};

export const Account = styled((props: AccountProps) => {
  const { userInfo } = useAuth();
  const { loading, setLoading } = useLoading();
  const { setSnackbar } = useSnackbar();
  const [userMenu, setUserMenu] = useState<HTMLElement | null>(null);
  const userMenuOpen = Boolean(userMenu);

  const handleUserMenuClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    setUserMenu(e.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenu(null);
  };

  const handleSignOutClick = async () => {
    try {
      setLoading({ active: true });
      if (typeof props.onSignOut === "function") {
        await props.onSignOut();
      }
      await signOut(auth);
      redirect(setLoading, "/");
    } catch (err) {
      setSnackbar({
        active: true,
        message: err,
        type: "error",
      });
      setLoading({ active: false });
    } finally {
      handleUserMenuClose();
    }
  };

  return userInfo?.email ? (
    <div className={`Account-root ${props.className}`}>
      <IconButton
        aria-controls="account-menu"
        aria-expanded={userMenuOpen ? "true" : "false"}
        aria-haspopup="true"
        className="Account-button"
        disabled={loading.active}
        id="account-button"
        onClick={handleUserMenuClick}
      >
        <UserAvatar
          alt={userInfo.displayName ?? userInfo.email ?? undefined}
          src={userInfo.photoURL}
          strings={props.strings}
        />
      </IconButton>
      <Menu
        anchorEl={userMenu}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        className="Account-menu"
        id="account-menu"
        MenuListProps={{
          "aria-labelledby": "account-button",
        }}
        onClose={handleUserMenuClose}
        open={userMenuOpen}
      >
        <LinkMenuItem NextLinkProps={{ href: "/settings" }}>
          {props.strings["settings"]}
        </LinkMenuItem>
        <MenuItem disabled={loading.active} onClick={handleSignOutClick}>
          {props.strings["signOut"]}
        </MenuItem>
      </Menu>
    </div>
  ) : (
    <div className={`Account-root ${props.className}`}>
      <LinkButton className="Account-auth" NextLinkProps={{ href: "/auth" }} variant="outlined">
        {props.strings["signIn"]}
      </LinkButton>
      <LinkButton
        className="Account-register"
        NextLinkProps={{ href: "/register" }}
        variant="outlined"
      >
        {props.strings["register"]}
      </LinkButton>
    </div>
  );
})`
  ${({ theme }) => `
    & .Account-button {
      padding: 0;

      &.Mui-disabled .MuiAvatar-root {
        border-color: ${theme.palette.action.disabled};
      }

      & .MuiAvatar-root {
        border: 2px solid ${theme.palette.primary.main};
      }
    }

    & .Account-register {
      margin-left: ${theme.spacing(2)};
    }
  `}
`;

Account.displayName = "Account";
