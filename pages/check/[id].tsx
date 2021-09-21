import { IconButton } from "@mui/material";
import { styled } from "@mui/material/styles";
import { ArrowBack, PersonAdd, Settings, Share } from "@mui/icons-material";
import { Account } from "components/Account";
import { ActionButton } from "components/check/ActionButton";
import { CheckDisplay, CheckDisplayProps } from "components/check/CheckDisplay";
import {
  CheckSettings,
  CheckSettingsProps,
  CheckSettingsUsers,
} from "components/check/CheckSettings";
import { LinkIconButton, redirect } from "components/Link";
import { ValidateForm, ValidateTextField } from "components/ValidateForm";
import { BaseProps, Check, Contributor, Item } from "declarations";
import {
  arrayRemove,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import localeSubset from "locales/check.json";
import { InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import {
  ChangeEventHandler,
  FocusEventHandler,
  MouseEventHandler,
  useEffect,
  useState,
} from "react";
import { verifyAuthToken } from "services/authenticator";
import { UnauthorizedError } from "services/error";
import { db } from "services/firebase";
import { dbAdmin } from "services/firebaseAdmin";
import { formatCurrency } from "services/formatter";
import { getLocaleStrings } from "services/locale";
import { withContextErrorHandler } from "services/middleware";
import { useLoading } from "utilities/LoadingContextProvider";
import { useSnackbar } from "utilities/SnackbarContextProvider";

const Page = styled(
  (
    props: InferGetServerSidePropsType<typeof getServerSideProps> & Pick<BaseProps, "className">
  ) => {
    const { loading, setLoading } = useLoading();
    const router = useRouter();
    const { setSnackbar } = useSnackbar();
    const [contributors, setContributors] = useState<Contributor[]>(props.check.contributors || []);
    const [localContributors, setLocalContributors] = useState<Contributor[]>([]);
    const [items, setItems] = useState<Item[]>(props.check.items);
    const [localItems, setLocalItems] = useState<Item[]>([]);
    const [name, setName] = useState(props.check.name);
    const [users, setUsers] = useState<CheckSettingsUsers>({
      editor: props.check.editor || {},
      owner: props.check.owner || {},
      viewer: props.check.viewer || {},
    });
    const [checkSettingsOpen, setCheckSettingsOpen] = useState(false);
    const locale = router.locale ?? router.defaultLocale!;
    let unsubscribe: undefined | (() => void);
    const checkUrl =
      typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";

    const handleActionButtonClick = () => {
      const newItems = localItems.concat({
        buyer: 0,
        cost: 0,
        id: doc(collection(db, "checks")).id,
        name: props.strings["newItem"],
        split: contributors.map(() => 1),
      });
      setLocalItems(newItems);
    };

    const handleBuyerChange: CheckDisplayProps["onBuyerChange"] = async (e, type, itemIndex) => {
      try {
        let newItems;
        const value = e.target.selectedIndex;
        if (type === "new" && localItems[itemIndex].buyer !== value) {
          const extractedItem = localItems.splice(itemIndex, 1);
          extractedItem[0].buyer = value;
          newItems = items.concat(extractedItem);
          setLocalItems(localItems);
        } else if (type === "existing" && items[itemIndex].buyer !== value) {
          newItems = items.slice();
          newItems[itemIndex].buyer = value;
        }
        if (typeof newItems !== "undefined") {
          setItems(newItems);
          const checkDoc = doc(db, "checks", props.check.id);
          updateDoc(checkDoc, {
            items: newItems,
          });
        }
      } catch (err) {
        setSnackbar({
          active: true,
          message: err,
          type: "error",
        });
      }
    };

    const handleCheckDelete = async () => {
      try {
        setLoading({
          active: true,
          id: "checkSettingsDelete",
        });
        const batch = writeBatch(db);
        const checkDoc = doc(db, "checks", props.check.id);
        const userQuery = query(
          collection(db, "users"),
          where("checks", "array-contains", checkDoc)
        );
        const querySnapshot = await getDocs(userQuery);
        querySnapshot.forEach((userDoc) => {
          batch.update(userDoc.ref, {
            checks: arrayRemove(checkDoc),
          });
        });
        batch.delete(checkDoc);
        await batch.commit();
        redirect(setLoading, "/");
      } catch (err) {
        setSnackbar({
          active: true,
          message: err,
          type: "error",
        });
        setLoading({
          active: false,
          id: "checkSettingsDelete",
        });
      }
    };

    const handleContributorBlur: CheckDisplayProps["onContributorBlur"] = async (
      e,
      type,
      contributorIndex
    ) => {
      try {
        const target = e.target;
        const value = target.value;
        if (target.checkValidity()) {
          let newContributors;
          let newItems: Item[] | undefined;
          // checkValidity() checks for dirty inputs on new contributors
          if (type === "new") {
            const extractedContributor = localContributors.splice(contributorIndex, 1);
            extractedContributor[0] = value;
            newContributors = contributors.concat(extractedContributor);
            newItems = items.slice();
            newItems.forEach((item) => {
              item.split?.push(0);
            });
            setLocalContributors([...localContributors]);
            setItems(newItems);
          } else if (type === "existing" && contributors[contributorIndex] !== value) {
            newContributors = contributors.slice();
            newContributors[contributorIndex] = value;
          }
          if (typeof newContributors !== "undefined") {
            setContributors(newContributors);
            const updateData = {
              contributors: newContributors,
              items: newItems,
            };
            const checkDoc = doc(db, "checks", props.check.id);
            await updateDoc(checkDoc, updateData);
          }
        }
      } catch (err) {
        setSnackbar({
          active: true,
          message: err,
          type: "error",
        });
      }
    };

    const handleCostBlur: CheckDisplayProps["onCostBlur"] = async (e, type, itemIndex) => {
      try {
        const target = e.target;
        if (target.checkValidity()) {
          const value = Number(target.dataset.value);
          let newItems;
          if (type === "new" && localItems[itemIndex].cost !== value) {
            const extractedItem = localItems.splice(itemIndex, 1);
            extractedItem[0].cost = value;
            newItems = items.concat(extractedItem);
            setLocalItems([...localItems]);
          } else if (type === "existing" && items[itemIndex].cost !== value) {
            newItems = items.slice();
            newItems[itemIndex].cost = value;
          }
          if (typeof newItems !== "undefined") {
            setItems(newItems);
            const checkDoc = doc(db, "checks", props.check.id);
            updateDoc(checkDoc, {
              items: newItems,
            });
          }
        }
      } catch (err) {
        setSnackbar({
          active: true,
          message: err,
          type: "error",
        });
      }
    };

    const handleItemNameBlur: CheckDisplayProps["onItemNameBlur"] = async (e, type, itemIndex) => {
      try {
        const target = e.target;
        if (target.checkValidity()) {
          const value = target.value;
          let newItems;
          if (type === "new" && localItems[itemIndex].name !== value) {
            const extractedItem = localItems.splice(itemIndex, 1);
            extractedItem[0].name = value;
            newItems = items.concat(extractedItem);
            setLocalItems([...localItems]);
          } else if (type === "existing" && items[itemIndex].name !== value) {
            newItems = items.slice();
            newItems[itemIndex].name = value;
          }
          if (typeof newItems !== "undefined") {
            setItems(newItems);
            const checkDoc = doc(db, "checks", props.check.id);
            updateDoc(checkDoc, {
              items: newItems,
            });
          }
        }
      } catch (err) {
        setSnackbar({
          active: true,
          message: err,
          type: "error",
        });
      }
    };

    const handleNameBlur: FocusEventHandler<HTMLInputElement> = async (e) => {
      try {
        if (e.target.checkValidity() && name !== props.check.name) {
          const checkDoc = doc(db, "checks", props.check.id);
          await updateDoc(checkDoc, {
            name,
          });
        }
      } catch (err) {
        setSnackbar({
          active: true,
          message: err,
          type: "error",
        });
      }
    };

    const handleNameChange: ChangeEventHandler<HTMLInputElement> = (e) => {
      setName(e.target.value);
    };

    const handleCheckSettingsClose: CheckSettingsProps["onClose"] = (_e, _reason) => {
      setCheckSettingsOpen(false);
    };

    const handleSettingsDialogOpen: MouseEventHandler<HTMLButtonElement> = (_e) => {
      setCheckSettingsOpen(true);
    };

    const handleSplitBlur: CheckDisplayProps["onSplitBlur"] = async (
      e,
      type,
      itemIndex,
      splitIndex
    ) => {
      try {
        const target = e.target;
        if (target.checkValidity()) {
          const value = Number(target.value);
          let newItems;
          if (type === "new" && localItems[itemIndex].split?.[splitIndex] !== value) {
            const extractedItem = localItems.splice(itemIndex, 1);
            const itemSplit = extractedItem[0].split;
            if (typeof itemSplit !== "undefined") {
              itemSplit[splitIndex] = value;
              newItems = items.concat(extractedItem);
              setLocalItems([...localItems]);
            }
          } else if (type === "existing" && items[itemIndex].split?.[splitIndex] !== value) {
            newItems = items.slice();
            const itemSplit = newItems[itemIndex].split;
            if (typeof itemSplit !== "undefined") {
              itemSplit[splitIndex] = value;
            }
          }
          if (typeof newItems !== "undefined") {
            setItems(newItems);
            const checkDoc = doc(db, "checks", props.check.id);
            updateDoc(checkDoc, {
              items: newItems,
            });
          }
        }
      } catch (err) {
        setSnackbar({
          active: true,
          message: err,
          type: "error",
        });
      }
    };

    const handleUserAccessChange: CheckSettingsProps["onUserAccessChange"] = (
      _e,
      uid,
      currentAccess,
      newAccess
    ) => {
      const newUsers = { ...users };
      const newUserAccess = newUsers[newAccess];
      const currentUserAccess = newUsers[currentAccess][uid];
      if (typeof newUserAccess !== "undefined") {
        newUserAccess[uid] = currentUserAccess;
      } else {
        newUsers[newAccess] = {
          [uid]: currentUserAccess,
        };
      }
      delete newUsers[currentAccess][uid];
      setUsers(newUsers);
    };

    const handleUserAccessDelete: CheckSettingsProps["onUserAccessDelete"] = (
      _e,
      uid,
      currentAccess
    ) => {
      const newUsers = { ...users };
      delete newUsers[currentAccess][uid];
      setUsers(newUsers);
    };

    const handleUserAccessSave = async () => {
      try {
        setLoading({
          active: true,
          id: "checkSettingsSave",
        });
        const checkDoc = doc(db, "checks", props.check.id);
        await updateDoc(checkDoc, {
          ...users,
        });
      } catch (err) {
        setSnackbar({
          active: true,
          message: err,
          type: "error",
        });
      } finally {
        setLoading({
          active: false,
          id: "checkSettingsSave",
        });
      }
    };

    useEffect(() => {
      unsubscribe = onSnapshot(doc(db, "checks", props.check.id), (snapshot) => {
        if (!snapshot.metadata.hasPendingWrites) {
          const checkData = snapshot.data() as Check;
          if (typeof checkData !== "undefined") {
            if (checkData.name !== name) {
              setName(checkData.name);
            }
            if (typeof checkData.items === "object" && Array.isArray(checkData.items)) {
              checkData.items.forEach((item) => {
                if (typeof item.name !== "undefined") {
                  const nameEl = document.getElementById(`name-${item.id}`) as HTMLInputElement;
                  if (nameEl) {
                    nameEl.value = item.name;
                  }
                }
                if (typeof item.cost !== "undefined") {
                  const costEl = document.getElementById(`cost-${item.id}`) as HTMLInputElement;
                  if (costEl) {
                    const itemCost = item.cost;
                    costEl.dataset.value = itemCost.toString();
                    costEl.value = formatCurrency(locale, itemCost);
                  }
                }
                if (typeof item.buyer !== "undefined") {
                  const buyerEl = document.getElementById(`buyer-${item.id}`) as HTMLSelectElement;
                  if (buyerEl) {
                    buyerEl.value = item.buyer.toString();
                  }
                }
                if (typeof item.split !== "undefined") {
                  item.split.forEach((split, splitIndex) => {
                    const splitEl = document.getElementById(
                      `split-${item.id}-${splitIndex}`
                    ) as HTMLInputElement;
                    if (splitEl) {
                      splitEl.value = split.toString();
                    }
                  });
                }
              });
              setItems([...checkData.items]);
            }
            if (
              typeof checkData.contributors === "object" &&
              Array.isArray(checkData.contributors)
            ) {
              checkData.contributors.forEach((contributor, contributorIndex) => {
                if (typeof contributor !== "undefined") {
                  const contributorEl = document.getElementById(
                    `contributor-${contributorIndex}`
                  ) as HTMLInputElement;
                  if (contributorEl) {
                    contributorEl.value = contributor;
                  }
                }
              });
              setContributors([...checkData.contributors]);
            }
          } else if (typeof unsubscribe === "function") {
            unsubscribe();
          }
        }
      });

      return () => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      };
    }, []);

    return (
      <ValidateForm className={props.className}>
        <header className="Header-root">
          <LinkIconButton className="Header-back" NextLinkProps={{ href: "/" }}>
            <ArrowBack />
          </LinkIconButton>
          <ValidateTextField
            className="Header-title"
            label={props.strings["name"]}
            onBlur={handleNameBlur}
            onChange={handleNameChange}
            size="small"
            value={name}
          />
          <IconButton
            className="Header-settings"
            disabled={loading.active}
            onClick={handleSettingsDialogOpen}
          >
            <Settings />
          </IconButton>
          <Account onSignOut={unsubscribe} strings={props.strings} />
        </header>
        <main className="Body-root">
          <CheckDisplay
            contributors={contributors}
            items={items}
            loading={loading.active}
            localContributors={localContributors}
            localItems={localItems}
            onBuyerChange={handleBuyerChange}
            onContributorBlur={handleContributorBlur}
            onCostBlur={handleCostBlur}
            onItemNameBlur={handleItemNameBlur}
            onSplitBlur={handleSplitBlur}
            strings={props.strings}
          />
        </main>
        <ActionButton
          checkId={props.check.id}
          label={props.strings["addItem"]}
          onClick={handleActionButtonClick}
          subActions={[
            {
              Icon: PersonAdd,
              name: props.strings["addContributor"],
              onClick: () => {
                const newLocalContributors = localContributors.concat("");
                setLocalContributors(newLocalContributors);
              },
            },
            {
              Icon: Share,
              name: props.strings["share"],
              onClick: async () => {
                try {
                  await navigator.share({
                    title: name,
                    url: checkUrl,
                  });
                } catch (err) {
                  navigator.clipboard.writeText(checkUrl);
                  setSnackbar({
                    active: true,
                    message: props.strings["linkCopied"],
                    type: "success",
                  });
                }
              },
            },
          ]}
        />
        <CheckSettings
          checkUrl={checkUrl}
          onCheckDelete={handleCheckDelete}
          onClose={handleCheckSettingsClose}
          onUserAccessChange={handleUserAccessChange}
          onUserAccessDelete={handleUserAccessDelete}
          onUserAccessSave={handleUserAccessSave}
          open={checkSettingsOpen}
          strings={props.strings}
          users={users}
        />
      </ValidateForm>
    );
  }
)`
  ${({ theme }) => `
    display: flex;
    flex-direction: column;
    height: 100vh;

    & .Body-root {
      flex: 1;
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
      margin-left: ${theme.spacing(2)};
    }
  `}
`;

export const getServerSideProps = withContextErrorHandler(async (context) => {
  if (context.req.cookies.authToken) {
    const decodedToken = await verifyAuthToken(context);
    if (decodedToken !== null && context.locale) {
      const strings = getLocaleStrings(context.locale, localeSubset);
      const checkData: Check | undefined = (
        await dbAdmin
          .collection("checks")
          .doc(context.query.id as string)
          .get()
      ).data();
      if (
        typeof checkData !== "undefined" &&
        (checkData.owner?.[decodedToken.uid] ||
          checkData.editor?.[decodedToken.uid] ||
          checkData.viewer?.[decodedToken.uid])
      ) {
        return {
          props: {
            auth: decodedToken,
            check: { ...checkData, id: context.query.id },
            strings,
          },
        };
      }
    }
  }
  throw new UnauthorizedError();
});

export default Page;
