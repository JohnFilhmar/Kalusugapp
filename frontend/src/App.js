import { createContext, useEffect, useRef, useState } from "react";

import Notfound from "./components/Notfound";
import TopNav from "./components/TopNavBar/TopNav";
import SideMenu from "./components/TopNavBar/SideMenu";

import Home from "./components/MainContent/Components/Home/Home.js";
import Dashboard from "./components/MainContent/Components/Dashboard/Dashboard";
import Records from "./components/MainContent/Components/Records/Records";
import Analytics from "./components/MainContent/Components/Analytics/Analytics";
import Pharmacy from "./components/MainContent/Components/Pharmacy/Pharmacy.js";
import BloodUnit from "./components/MainContent/Components/BloodUnit";
import Queue from "./components/MainContent/Components/Queue/Queue.js";
import Appointments from "./components/MainContent/Components/Appointments/Appointments.js";
import Accounts from "./components/MainContent/Components/Accounts/Accounts.js";
import Equipments from "./components/MainContent/Components/Equipments/Equipments.js";
import Mapping from "./components/MainContent/Components/Mapping/Mapping.js";
import JsonWebToken from "./components/MainContent/Components/Playground/JsonWebToken.js";
import Problems from "./components/MainContent/Components/Playground/Problems.js";
import IndexedDb from "./components/MainContent/Components/Playground/IndexedDb.js";
import Login from "./components/Login.js";

import api from "./axios.js";
import useIndexedDB from "./hooks/useIndexedDb.js";
import { socket } from "./socket.js";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Spinner } from "flowbite-react";
import { jwtDecode } from "jwt-decode";
import PublicQueue from "./components/MainContent/Components/Queue/PublicQueue.js";
import HistoricalData from "./components/MainContent/Components/Records/HistoricalData/HistoricalData.js";
import InsightsAndPredictions from "./components/MainContent/Components/InsightsAndPredictions/InsightsAndPredictions.js";

export const messaging = createContext();
export const colorTheme = createContext();
export const notificationMessage = createContext();
export const isLoggedInContext = createContext();
export const accessibilityContext = createContext();

const App = () => {
  const [selectedTheme, setSelectedTheme] = useState(
    localStorage.getItem("theme")
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userAccessibilities, setUserAccessibilities] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPageFullyLoaded, setIsPageFullyLoaded] = useState(false);

  const [notifMessage, setNotifMessage] = useState(null);

  const [isConnected, setIsConnected] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messengerList, setMessengerList] = useState(null);
  const [isMessengerListOpen, setIsMessengerListOpen] = useState(false);
  const isMessengerListOpenRef = useRef(isMessengerListOpen);
  const [conversation, setConversation] = useState(null);
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const isConversationOpenRef = useRef(isConversationOpen);

  useEffect(() => {
    isMessengerListOpenRef.current = isMessengerListOpen;
    isConversationOpenRef.current = isConversationOpen;
  }, [isConversationOpen, isMessengerListOpen]);

  const [tokens, setTokens] = useState(null);
  const { getAllItems, clearStore, updateItem } = useIndexedDB();

  const colors = [
    "gray",
    "red",
    "orange",
    "lime",
    "green",
    "teal",
    "cyan",
    "blue",
    "indigo",
    "violet",
    "purple",
    "fuchsia",
    "pink",
  ];

  const navigate = useNavigate();
  const location = useLocation();

  async function getIdbTokens() {
    const idb = await getAllItems("tokens");
    setTokens(idb?.accessToken);
  }

  useEffect(() => {
    socket.connect();
    const handlePageLoad = () => {
      setIsPageFullyLoaded(true);
    };
    window.addEventListener("load", handlePageLoad);
    getIdbTokens();
    const time = setTimeout(() => {
      socket.emit("joinRoom", tokens && jwtDecode(tokens).uuid);
      setIsLoading(false);
    }, 3000);
    if (!colors.includes(localStorage.getItem("theme"))) {
      localStorage.setItem("theme", "blue");
    }
    return () => {
      clearTimeout(time);
      window.removeEventListener("load", handlePageLoad);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const uuid = tokens && jwtDecode(tokens).uuid;
      socket.on("connect", () => {
        const myFun = (rooms) => {
          if (uuid && rooms && !rooms.includes(uuid)) {
            socket.emit("joinRoom", tokens && jwtDecode(tokens).uuid);
          }
        };
        socket.emit("checkRooms", myFun);
      });

      socket.on("messagingSocket", (data) => {
        if (data?.status === "ok") {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      });

      socket.on("messageSocket", (data) => {
        const user_id = tokens && jwtDecode(tokens).user_id;
        if (
          isConversationOpenRef.current &&
          user_id !== data.conversation.sender_id
        ) {
          setConversation((prev) => {
            if (prev) {
              return [...prev, data.conversation];
            } else {
              return data.conversation;
            }
          });
        }
        /* 
        setMessengerList((prev) => {
          const updatedList = prev?.map((item) => {
            if (item) {
              if (item.sender_id === data.messenger[0].sender_id) {
                return {
                  ...item,
                  message_id: data.messenger[0].message_id,
                  is_read: user_id === item.sender_id,
                  sender_id: data.messenger[0].sender_id,
                  receiver_id: data.messenger[0].receiver_id,
                  message: data.messenger[0].message,
                  datetime_sent: data.messenger[0].datetime_sent,
                };
              }
            } else {
              console.log(data.messenger);
              return data.messenger;
            }
            return item;
          });
          console.log(updatedList);
          return updatedList.length > 0 ? updatedList : data.messenger;
        });
        */
      });

      socket.on('targetError', (data) => {
        console.log(data);
      });

      return () => {
        socket.off("connect");
        socket.off("messagingSocket");
        socket.off("messageSocket");
        socket.off("targetError");
      };
    }
    if (location.pathname === '/') {
      navigate("/home");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  async function getAccessibilities() {
    try {
      const dd = await api.get("getAccessibilities");
      if (dd?.status === 200) {
        setUserAccessibilities(dd.data.accessibilities);
      }
    } catch (error) {
      console.error(`Something have gone wrong:`, error);
    }
  }
  async function getSetDashboardData() {
    try {
      const dd = await api.get("getDashBoardData");
      if (dd?.status === 200) {
        localStorage.setItem("dashboardData", JSON.stringify(dd.data.data));
      }
    } catch (error) {
      console.error(`Something have gone wrong:`, error);
    }
  }
  async function getSetMessengerList() {
    try {
      const { data: messenger } = await api.get("/getChatUsernames", {
        headers: { Authorization: `Bearer ${tokens}` },
        withCredentials: true,
        secure: true,
      });
      if (messenger?.data) {
        setMessengerList(messenger.data);
      }
    } catch (error) {
      console.error(`Something have gone wrong:`, error);
    }
  }

  const verifyAccessToken = async () => {
    let time;
    try {
      setIsLoading(true);
      const res = await api.get("/verifyToken", {
        headers: { Authorization: `Bearer ${tokens}` },
        withCredentials: true,
        secure: true,
      });
      if (res?.status === 401) {
        await clearStore("tokens");
        setNotifMessage(res.data.message);
        navigate("/home");
      } else if (res?.status === 200) {
        if (location.pathname !== "/home") {
          navigate("/home");
        }
        await updateItem("tokens", "accessToken", res.data.accessToken);
        setIsLoggedIn(true);
        await Promise.all([getAccessibilities(), getSetDashboardData(), getSetMessengerList()]);
        setIsLoading(false);
      } else {
        setNotifMessage("Something went wrong checking your session");
        time = setTimeout(async () => {
          setNotifMessage(null);
          await clearStore("tokens");
          if (location.pathname !== "/login") {
            navigate("/login");
          }
        }, 3000);
        setIsLoading(false);
        return () => clearTimeout(time);
      }
    } catch (error) {
      if (error?.response?.data.status === 401) {
        await clearStore("tokens");
      }
      console.error("Verification error:", error);
      if (location.pathname !== "/login") {
        navigate("/login");
      }
      setNotifMessage("Something went wrong");
      time = setTimeout(() => {
        setNotifMessage(null);
      }, 8000);
      setIsLoading(false);
      return () => clearTimeout(time);
    }
    return () => {
      if (time) clearTimeout(time);
    };
  };

  useEffect(() => {
    if (tokens) {
      verifyAccessToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  if (isLoading || !isPageFullyLoaded) {
    return (
      <div className="font-bold text-center flex justify-center items-center bg-white h-screen w-screen">
        <Spinner className="size-32" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen overflow-hidden">
        <notificationMessage.Provider value={[notifMessage, setNotifMessage]}>
          <colorTheme.Provider
            value={[selectedTheme, setSelectedTheme, colors]}
          >
            <isLoggedInContext.Provider value={[isLoggedIn]}>
            <accessibilityContext.Provider value={[userAccessibilities]}>
              <messaging.Provider
                value={{
                  tokens,
                  isConnected,
                  setIsConnected,
                  messengerList,
                  setMessengerList,
                  isMessengerListOpen,
                  setIsMessengerListOpen,
                  selectedChat,
                  setSelectedChat,
                  conversation,
                  setConversation,
                  isConversationOpen,
                  setIsConversationOpen,
                }}
              >
                <TopNav />
              </messaging.Provider>
              {isLoggedIn && (
                <>
                  <div className="flex h-full">
                    <div
                      className={`w-auto bg-${selectedTheme}-300 max-h-full md:max-h-full lg:max-h-full overflow-y-auto drop-shadow-md transition-all`}
                    >
                      <SideMenu />
                    </div>
                    <div
                      className={`w-full h-auto bg-${selectedTheme}-100 overflow-y-hidden`}
                    >
                      <Routes>
                        <Route path="home" element={<Home />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="insights_and_predictions" element={<InsightsAndPredictions />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="mapping" element={<Mapping />} />
                        <Route path="appointments" element={<Appointments />} />
                        <Route path="queue" element={<Queue />} />
                        <Route path="records" element={<Records />} />
                        <Route path="historical_data" element={<HistoricalData />} />
                        <Route path="pharmacy" element={<Pharmacy />} />
                        <Route path="equipments" element={<Equipments />} />
                        <Route path="blood_unit" element={<BloodUnit />} />
                        <Route path="accounts" element={<Accounts />} />
                        <Route
                          path="playground-jwt"
                          element={<JsonWebToken />}
                        />
                        <Route path="indexed-db" element={<IndexedDb />} />
                        <Route path="problems" element={<Problems />} />
                        <Route path="*" element={<Notfound />} />
                      </Routes>
                    </div>
                  </div>
                </>
              )}
              {!isLoggedIn && (
                <>
                  <div className="flex h-full">
                    <div
                      className={`w-auto bg-${selectedTheme}-300 max-h-full md:max-h-full lg:max-h-full overflow-y-auto drop-shadow-md transition-all`}
                    >
                      <SideMenu />
                    </div>
                    <div
                      className={`w-full h-auto bg-${selectedTheme}-100 overflow-y-hidden`}
                    >
                      <Routes>
                        <Route path="home" element={<Home />} />
                        <Route path="queue" element={<PublicQueue />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="login" element={<Login />} />
                        {/* <Route path="register" element={<Register />} /> */}
                        <Route path="*" element={<Notfound />} />
                      </Routes>
                    </div>
                  </div>
                </>
              )}
            </accessibilityContext.Provider>
            </isLoggedInContext.Provider>
          </colorTheme.Provider>
        </notificationMessage.Provider>
      </div>
    </>
  );
};

export default App;
