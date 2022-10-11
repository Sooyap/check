import { Feedback, Login, Logout, SettingsApplications } from "@mui/icons-material";
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  useMediaQuery,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import { useAuth } from "components/AuthContextProvider";
import { LinkButton, LinkIconButton, LinkMenuItem, redirect } from "components/Link";
import { useLoading } from "components/LoadingContextProvider";
import { useSnackbar } from "components/SnackbarContextProvider";
import { UserAvatar } from "components/UserAvatar";
import { BaseProps } from "declarations";
import { signOut } from "firebase/auth";
import { useRouter } from "next/router";
import { MouseEventHandler, useState } from "react";
import { auth } from "services/firebase";

export type AccountProps = Pick<BaseProps, "className" | "strings"> & {
  disabledMenuItems?: string[];
  onSignOut?: () => Promise<void>;
};

export const Account = styled((props: AccountProps) => {
  const router = useRouter();
  const theme = useTheme();
  const { userInfo } = useAuth();
  const { loading, setLoading } = useLoading();
  const { setSnackbar } = useSnackbar();
  const [userMenu, setUserMenu] = useState<HTMLElement | null>(null);
  const downMd = useMediaQuery(theme.breakpoints.down("md"));
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
      if (router.pathname === "/") {
        router.reload();
      } else {
        redirect(setLoading, "/");
      }
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
        aria-label={props.strings["account"]}
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
        className={`Account-menu ${props.className}`}
        id="account-menu"
        MenuListProps={{
          "aria-labelledby": "account-button",
        }}
        onClose={handleUserMenuClose}
        open={userMenuOpen}
      >
        <LinkMenuItem
          disabled={loading.active || props.disabledMenuItems?.includes("settings")}
          NextLinkProps={{ href: "/settings" }}
        >
          <ListItemIcon>
            <SettingsApplications />
          </ListItemIcon>
          <ListItemText primary={props.strings["settings"]} />
        </LinkMenuItem>
        <LinkMenuItem
          disabled={loading.active || props.disabledMenuItems?.includes("sendFeedback")}
          NextLinkProps={{ href: "/feedback" }}
        >
          <ListItemIcon>
            <Feedback />
          </ListItemIcon>
          <ListItemText primary={props.strings["sendFeedback"]} />
        </LinkMenuItem>
        <MenuItem
          disabled={loading.active || props.disabledMenuItems?.includes("signOut")}
          onClick={handleSignOutClick}
        >
          <ListItemIcon>
            <Logout />
          </ListItemIcon>
          <ListItemText primary={props.strings["signOut"]} />
        </MenuItem>
      </Menu>
    </div>
  ) : (
    <div className={`Account-root ${props.className}`}>
      {downMd ? (
        <LinkIconButton
          aria-label={props.strings["register"]}
          color="primary"
          NextLinkProps={{ href: "/register", passHref: true }}
        >
          <Login />
        </LinkIconButton>
      ) : (
        <>
          <LinkButton NextLinkProps={{ href: "/auth" }} variant="outlined">
            {props.strings["signIn"]}
          </LinkButton>
          <LinkButton NextLinkProps={{ href: "/register" }} variant="outlined">
            {props.strings["register"]}
          </LinkButton>
        </>
      )}
    </div>
  );
})`
  ${({ theme }) => `
    &.Account-root {
      display: flex;
      gap: ${theme.spacing(2)};
    }

    & .Account-button {
      padding: 0;

      &.Mui-disabled .MuiAvatar-root {
        border-color: ${theme.palette.action.disabled};
      }

      & .MuiAvatar-root {
        border: 2px solid ${theme.palette.primary.main};
      }
    }

    & .MuiMenuItem-root > a {
      color: inherit;
      display: contents;
    }
  `}
`;

Account.displayName = "Account";
