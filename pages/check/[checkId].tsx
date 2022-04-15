import { ArrowBack, PersonAdd, Settings, Share } from "@mui/icons-material";
import { IconButton, TextField } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Account } from "components/Account";
import { ActionButton } from "components/ActionButton";
import { CheckDisplay, CheckDisplayProps, TotalsHandle } from "components/check/CheckDisplay";
import { CheckSettings, CheckSettingsProps } from "components/check/CheckSettings";
import { CheckSummary, CheckSummaryProps } from "components/check/CheckSummary";
import { LinkIconButton, redirect } from "components/Link";
import {
  AccessType,
  AuthUser,
  BaseProps,
  Check,
  CheckDataForm,
  CheckSettings as CheckSettingsType,
  UserAdmin,
} from "declarations";
import { FieldValue } from "firebase-admin/firestore";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import localeSubset from "locales/check.json";
import { InferGetServerSidePropsType } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  ChangeEventHandler,
  FocusEventHandler,
  MouseEventHandler,
  useEffect,
  useRef,
  useState,
} from "react";
import { getAuthUser } from "services/authenticator";
import { UnauthorizedError, ValidationError } from "services/error";
import { db, generateUid } from "services/firebase";
import { dbAdmin } from "services/firebaseAdmin";
import {
  formatAccessLink,
  formatCurrency,
  formatInteger,
  interpolateString,
} from "services/formatter";
import { getCurrencyType, getLocaleStrings } from "services/locale";
import { withContextErrorHandler } from "services/middleware";
import { checkDataToCheck, checkToCheckData } from "services/transformer";
import { AuthType, useAuth } from "utilities/AuthContextProvider";
import { useLoading } from "utilities/LoadingContextProvider";
import { useSnackbar } from "utilities/SnackbarContextProvider";

const USER_ACCESS: AccessType[] = ["owner", "editor", "viewer"];

const Page = styled(
  (
    props: InferGetServerSidePropsType<typeof getServerSideProps> & Pick<BaseProps, "className">
  ) => {
    const router = useRouter();
    const locale = router.locale ?? router.defaultLocale!;
    const currency = getCurrencyType(locale);
    const { loading, setLoading } = useLoading();
    const { setSnackbar } = useSnackbar();
    const currentUserInfo = useAuth() as Required<AuthType>; // Only authenticated users can enter
    const [checkData, setCheckData] = useState<CheckDataForm>(
      checkToCheckData(locale, props.check)
    );
    const [checkSettings, setCheckSettings] = useState<CheckSettingsType>({
      editor: props.check.editor,
      invite: props.check.invite,
      owner: props.check.owner,
      viewer: props.check.viewer,
    });
    const currentUserAccess = USER_ACCESS.reduce(
      (prevAccessType, accessType, rank) =>
        checkSettings[accessType][currentUserInfo.uid] ? rank : prevAccessType,
      USER_ACCESS.length - 1
    ); // Start at lowest access until verified
    const [checkSettingsOpen, setCheckSettingsOpen] = useState(false);
    const [checkSummaryContributor, setCheckSummaryContributor] = useState(-1);
    const [checkSummaryOpen, setCheckSummaryOpen] = useState(false); // Use separate open state so data doesn't clear during dialog animation
    const writeAccess = !checkSettings.invite.required || currentUserAccess < 2;
    const [accessLink, setAccessLink] = useState(
      formatAccessLink(
        // Viewers may not view/share invite links
        !writeAccess ? false : props.check.invite.required,
        props.id,
        props.check.invite.id
      )
    );
    const unsubscribe = useRef(() => {});
    const totalsRef = useRef<TotalsHandle | null>(null);

    const handleContributorSummaryClick: CheckDisplayProps["onContributorSummaryClick"] = (
      contributorIndex
    ) => {
      setCheckSummaryOpen(true);
      setCheckSummaryContributor(contributorIndex);
    };

    const handleSettingsDialogClose: CheckSettingsProps["onClose"] = (_e, _reason) => {
      setCheckSettingsOpen(false);
    };

    const handleSettingsDialogOpen: MouseEventHandler<HTMLButtonElement> = (_e) => {
      setCheckSettingsOpen(true);
    };

    const handleShareClick: CheckSettingsProps["onShareClick"] = async (_e) => {
      try {
        await navigator.share({
          title: checkData.title.dirty,
          url: accessLink,
        });
      } catch (err) {
        navigator.clipboard.writeText(accessLink);
        setSnackbar({
          active: true,
          message: props.strings["linkCopied"],
          type: "success",
        });
      }
    };

    const handleSummaryDialogClose: CheckSummaryProps["onClose"] = (_e, _reason) => {
      setCheckSummaryOpen(false);
    };

    let handleTitleBlur: FocusEventHandler<HTMLInputElement> | undefined;
    let handleTitleChange: ChangeEventHandler<HTMLInputElement> | undefined;

    useEffect(() => {
      unsubscribe.current = onSnapshot(
        doc(db, "checks", props.id),
        (snapshot) => {
          if (!snapshot.metadata.hasPendingWrites) {
            const snapshotData = snapshot.data() as Check;
            if (typeof snapshotData !== "undefined") {
              setCheckData(checkToCheckData(locale, snapshotData));

              setAccessLink(
                formatAccessLink(
                  !writeAccess
                    ? false
                    : snapshotData.invite.required ?? checkSettings.invite.required, // If no write access, format as share link, else check if snapshot has restrictions, else fall back to current restriction
                  props.id,
                  snapshotData.invite.id ?? checkSettings.invite.id // Fall back to current invite ID
                )
              );
            } else {
              unsubscribe.current();
            }
          }
        },
        (err) => {
          if (err.code === "permission-denied") {
            unsubscribe.current();
            redirect(setLoading, "/");
          } else {
            setSnackbar({
              active: true,
              message: err,
              type: "error",
            });
          }
        }
      );

      return () => {
        unsubscribe.current();
      };
    }, []);

    let renderMain;
    if (writeAccess) {
      const handleAddContributorClick = async () => {
        try {
          const timestamp = Date.now();
          const stateCheckData = { ...checkData, updatedAt: timestamp };
          const formattedSplitValue = formatInteger(locale, 0);
          const newName = interpolateString(props.strings["contributorIndex"], {
            index: (checkData.contributors.length + 1).toString(),
          });
          const newContributor = {
            id: generateUid(),
            name: {
              clean: newName,
              dirty: newName,
            },
          };
          stateCheckData.contributors.push(newContributor);
          stateCheckData.items.forEach((item) => {
            item.split.push({
              clean: formattedSplitValue,
              dirty: formattedSplitValue,
            });
          });

          const checkDoc = doc(db, "checks", props.id);
          const docCheckData = checkDataToCheck(locale, currency, stateCheckData);
          updateDoc(checkDoc, {
            contributors: docCheckData.contributors,
            items: docCheckData.items,
            updatedAt: timestamp,
          });

          setCheckData(stateCheckData);
        } catch (err) {
          setSnackbar({
            active: true,
            message: err,
            type: "error",
          });
        }
      };

      const handleAddItemClick = async () => {
        try {
          const stateCheckData = { ...checkData };
          const newCost = formatCurrency(locale, 0);
          const newName = interpolateString(props.strings["itemIndex"], {
            index: (checkData.items.length + 1).toString(),
          });
          const newItem = {
            buyer: {
              clean: 0,
              dirty: 0,
            },
            cost: {
              clean: newCost,
              dirty: newCost,
            },
            id: generateUid(),
            name: {
              clean: newName,
              dirty: newName,
            },
            split: checkData.contributors.map(() => {
              const newSplit = formatInteger(locale, 1);
              return {
                clean: newSplit,
                dirty: newSplit,
              };
            }),
          };
          stateCheckData.items.push(newItem);

          const checkDoc = doc(db, "checks", props.id);
          const docCheckData = checkDataToCheck(locale, currency, stateCheckData);
          updateDoc(checkDoc, {
            items: docCheckData.items,
            updatedAt: Date.now(),
          });

          setCheckData(stateCheckData);
        } catch (err) {
          setSnackbar({
            active: true,
            message: err,
            type: "error",
          });
        }
      };

      handleTitleBlur = async (_e) => {
        try {
          if (checkData.title.clean !== checkData.title.dirty) {
            const stateCheckData = { ...checkData };
            stateCheckData.title.clean = stateCheckData.title.dirty;

            const checkDoc = doc(db, "checks", props.id);
            // Always convert to proper Check typing for safety
            const docCheckData = checkDataToCheck(locale, currency, stateCheckData);
            updateDoc(checkDoc, {
              title: docCheckData.title,
              updatedAt: Date.now(),
            });

            setCheckData(stateCheckData);
          }
        } catch (err) {
          setSnackbar({
            active: true,
            message: err,
            type: "error",
          });
        }
      };

      handleTitleChange = (e) => {
        const stateCheckData = { ...checkData };
        stateCheckData.title.dirty = e.target.value;
        setCheckData(stateCheckData);
      };
      // TODO: Fix memoization for performance

      renderMain = (
        <>
          <CheckDisplay
            checkData={checkData}
            checkId={props.id}
            className="Body-root"
            loading={loading.active}
            onContributorSummaryClick={handleContributorSummaryClick}
            ref={totalsRef}
            setCheckData={setCheckData}
            strings={props.strings}
            writeAccess={writeAccess}
          />
          <ActionButton
            label={props.strings["addItem"]}
            onClick={handleAddItemClick}
            subActions={[
              {
                Icon: PersonAdd,
                label: props.strings["addContributor"],
                onClick: handleAddContributorClick,
              },
              {
                Icon: Share,
                label: props.strings["share"],
                onClick: handleShareClick,
              },
            ]}
          />
          <CheckSettings
            accessLink={accessLink}
            checkId={props.id}
            checkSettings={checkSettings}
            onClose={handleSettingsDialogClose}
            onShareClick={handleShareClick}
            open={checkSettingsOpen}
            setAccessLink={setAccessLink}
            setCheckSettings={setCheckSettings}
            strings={props.strings}
            unsubscribe={unsubscribe.current}
            userAccess={currentUserAccess}
            writeAccess={writeAccess}
          />
        </>
      );
    } else {
      renderMain = (
        <>
          <CheckDisplay
            checkData={checkData}
            checkId={props.id}
            className="Body-root"
            loading={loading.active}
            onContributorSummaryClick={handleContributorSummaryClick}
            ref={totalsRef}
            setCheckData={setCheckData}
            strings={props.strings}
            writeAccess={writeAccess}
          />
          <ActionButton Icon={Share} label={props.strings["share"]} onClick={handleShareClick} />
          <CheckSettings
            accessLink={accessLink}
            checkId={props.id}
            checkSettings={checkSettings}
            onClose={handleSettingsDialogClose}
            onShareClick={handleShareClick}
            open={checkSettingsOpen}
            setAccessLink={setAccessLink}
            setCheckSettings={setCheckSettings}
            strings={props.strings}
            unsubscribe={unsubscribe.current}
            userAccess={currentUserAccess}
            writeAccess={writeAccess}
          />
        </>
      );
    }
    return (
      <div className={props.className}>
        <Head>
          <title>{checkData.title.dirty}</title>
        </Head>
        <header className="Header-root">
          <LinkIconButton className="Header-back" NextLinkProps={{ href: "/" }}>
            <ArrowBack />
          </LinkIconButton>
          <TextField
            className="Header-title"
            disabled={loading.active || !writeAccess}
            label={props.strings["name"]}
            onBlur={handleTitleBlur}
            onChange={handleTitleChange}
            size="small"
            value={checkData.title.dirty}
          />
          <IconButton
            className="Header-settings"
            disabled={loading.active}
            onClick={handleSettingsDialogOpen}
          >
            <Settings />
          </IconButton>
          <Account onSignOut={unsubscribe.current} strings={props.strings} />
        </header>
        {renderMain}
        <CheckSummary
          checkData={checkData}
          currentContributor={checkSummaryContributor}
          onClose={handleSummaryDialogClose}
          open={checkSummaryOpen}
          strings={props.strings}
        />
      </div>
    );
  }
)`
  ${({ theme }) => `
    display: flex;
    flex-direction: column;

    & .Body-root {
      overflow: auto;
    }

    & .Header-root {
      display: flex;
      margin: ${theme.spacing(2)};
    }

    & .Header-settings {
      margin-left: auto;
      margin-right: ${theme.spacing(2)};
    }

    & .Header-title {
      align-items: center;
      display: inline-flex;
      margin-left: ${theme.spacing(2)};
    }
  `}
`;

export const getServerSideProps = withContextErrorHandler(async (context) => {
  const strings = getLocaleStrings(localeSubset, context.locale);
  const data = await dbAdmin.runTransaction(async (transaction) => {
    if (typeof context.query.checkId !== "string") {
      throw new ValidationError(strings["invalidQuery"]);
    }
    const authUser = await getAuthUser(context);
    if (authUser !== null) {
      const checkRef = dbAdmin.collection("checks").doc(context.query.checkId);
      const check = await transaction.get(checkRef);
      const checkData = check.data();
      if (typeof checkData !== "undefined") {
        const restricted = checkData.invite.required;
        const userDoc = dbAdmin.collection("users").doc(authUser.uid);
        // Transaction reads must be before writes
        const userData = (await transaction.get(userDoc)).data() as UserAdmin | undefined;

        if (restricted === true) {
          if (context.query.inviteId === checkData.invite.id) {
            const userData: Partial<AuthUser> = {};
            if (authUser.displayName) {
              userData.displayName = authUser.displayName;
            }
            if (authUser.email) {
              userData.email = authUser.email;
            }
            if (authUser.photoURL) {
              userData.photoURL = authUser.photoURL;
            }

            // Make sure editor invites won't overwrite owner access
            if (checkData.invite.type === "editor" && !checkData.owner[authUser.uid]) {
              // Add user as editor if not an owner
              const editor = {
                ...checkData.editor,
                [authUser.uid]: userData,
              }; // Use spread to force into object if undefined
              // Promote viewers to editor if using an editor invite
              const viewer = { ...checkData.viewer };
              delete viewer[authUser.uid];
              transaction.set(
                checkRef,
                {
                  editor,
                  viewer,
                },
                { merge: true }
              );
            } else if (
              checkData.invite.type === "viewer" &&
              !checkData.owner[authUser.uid] &&
              !checkData.editor[authUser.uid]
            ) {
              // Add user as viewer if not an owner or editor
              const viewer = {
                ...checkData.viewer,
                [authUser.uid]: userData,
              };
              transaction.set(
                checkRef,
                {
                  viewer,
                },
                { merge: true }
              );
            }
          } else if (
            // Throw if restricted and not authorized
            !checkData.owner[authUser.uid] &&
            !checkData.editor[authUser.uid] &&
            !checkData.viewer[authUser.uid]
          ) {
            throw new UnauthorizedError();
          }
        }
        // If check reference doesn't exist in user's check array, add it in
        if (!userData?.checks?.some((check) => check.id === checkRef.id)) {
          transaction.set(
            userDoc,
            {
              checks: FieldValue.arrayUnion(checkRef),
            },
            { merge: true }
          );
        }
        return {
          auth: authUser,
          check: checkData,
          id: context.query.checkId,
        };
      }
    } else {
      throw new UnauthorizedError();
    }
  });
  return {
    props: { ...data, strings },
  };
});

export default Page;
