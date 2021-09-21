import { Avatar } from "@mui/material";
import { BaseProps } from "declarations";
import Image from "next/image";
import { AuthType } from "utilities/AuthContextProvider";

export type UserAvatarProps = AuthType & Pick<BaseProps, "strings">;

export const UserAvatar = (props: UserAvatarProps) => {
  const identifiedUser = props.displayName ?? props.email;
  const altText = identifiedUser ?? props.strings["anonymous"];
  const fallbackAvatar = typeof identifiedUser !== "undefined" ? altText.slice(0, 1) : undefined;
  return (
    <Avatar alt={altText}>
      {props.photoURL ? <Image layout="fill" priority src={props.photoURL} /> : fallbackAvatar}
    </Avatar>
  );
};
