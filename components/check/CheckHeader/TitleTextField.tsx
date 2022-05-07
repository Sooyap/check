import { TextField, TextFieldProps } from "@mui/material";
import { useSnackbar } from "components/SnackbarContextProvider";
import { CheckSettings } from "declarations";
import { doc, updateDoc } from "firebase/firestore";
import { Dispatch, memo, SetStateAction, useCallback, useRef } from "react";
import { db } from "services/firebase";

export type TitleTextFieldProps = TextFieldProps & {
  checkId: string;
  setCheckSettings: Dispatch<SetStateAction<CheckSettings>>;
  writeAccess: boolean;
};

export const TitleTextField = memo(
  ({ checkId, setCheckSettings, value, writeAccess, ...textFieldProps }: TitleTextFieldProps) => {
    const { setSnackbar } = useSnackbar();
    const cleanValue = useRef(value);

    const handleTitleBlur: TextFieldProps["onBlur"] = useCallback(async () => {
      try {
        if (writeAccess && cleanValue.current !== value) {
          setCheckSettings((stateCheckSettings) => {
            const checkDoc = doc(db, "checks", checkId);
            updateDoc(checkDoc, {
              title: stateCheckSettings.title,
              updatedAt: Date.now(),
            });

            return stateCheckSettings;
          });
          cleanValue.current = value;
        }
      } catch (err) {
        setSnackbar({
          active: true,
          message: err,
          type: "error",
        });
      }
    }, [checkId, writeAccess]);

    const handleTitleChange: TextFieldProps["onChange"] = useCallback(
      (e) => {
        if (writeAccess) {
          setCheckSettings((stateCheckSettings) => ({
            ...stateCheckSettings,
            title: e.target.value,
          }));
        }
      },
      [writeAccess]
    );

    return (
      <TextField
        {...textFieldProps}
        onBlur={handleTitleBlur}
        onChange={handleTitleChange}
        value={value}
      />
    );
  }
);

TitleTextField.displayName = "TitleTextField";
