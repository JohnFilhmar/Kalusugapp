import { useLocation } from "react-router-dom";
import Header from "../../Header";
import { MdClose, MdHome, MdKeyboardArrowLeft, MdKeyboardArrowRight, MdPeople } from "react-icons/md";
import { HiSpeakerphone } from "react-icons/hi";
import DashIcon from "../Dashboard/DashIcon";
import useQuery from "../../../../hooks/useQuery";
import { useContext, useEffect, useRef, useState } from "react";
import { IoCalendar } from "react-icons/io5";
import quotes from "../../../../health_quotes.json";
import { accessibilityContext, colorTheme, isLoggedInContext } from "../../../../App";
import { FaPlus, FaTrash } from "react-icons/fa";
import { socket } from "../../../../socket";

const Home = () => {
  const location = useLocation();
  const pathname = location.pathname.slice(1);
  const title = pathname.charAt(0).toUpperCase() + pathname.slice(1);
  const [selectedTheme] = useContext(colorTheme);
  const [isLoggedIn] = useContext(isLoggedInContext);
  const { response, isLoading, fetchData, postData, deleteData } = useQuery();
  const announcementRef = useRef(null);
  const [isDayScheduleOpen, setIsDayScheduleOpen] = useState(false);
  const [data, setData] = useState(null);
  const [quote, setQuote] = useState(null);
  const weekDays = ['M','T','W','T','F','S','S'];
  const [selectedDate, setSelectedDate] = useState(new Date());
  const getLastDayOfMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const [announcements, setAnnouncements] = useState([]);
  const [announcementDay, setAnnouncementDay] = useState(new Date());
  const [userAccessibilities] = useContext(accessibilityContext);

  const [payload, setPayload] = useState(null)

  const generateRandomQuote = () => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[randomIndex]);
  };
  
  useEffect(() => {
    generateRandomQuote();
    const interval = setInterval(() => {
      generateRandomQuote();
    },10000);
    const time = setTimeout( async () => {
      await fetchData("getHomeData");
    }, 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(time);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    socket.on("announcementSocket", (dat) => {
      setAnnouncements((prev = []) => ([
        ...(Array.isArray(prev) ? prev : []),
        ...(Array.isArray(dat) ? dat : [])
      ]));      
      setData(prev => ({
        ...prev,
        announcements: Array.isArray(prev?.announcements)
          ? [...prev.announcements, ...dat]
          : [...dat],
      }));      
    });
    socket.on("deleteAnnouncementSocket", (dat) => {
      setAnnouncements(prev => prev.filter(rec => rec.announcement_id !== dat));
      setData(prev => ({
        ...prev,
        announcements: prev.announcements.filter(rec => rec.announcement_id !== dat)
      }));
    });
    return () => {
      socket.off("announcementSocket");
      socket.off("deleteAnnouncementSocket");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    if (response?.status === 200 && response?.data) {
      setData(response?.data);
    }
    if (response?.status === 200 && response?.insertId) {
      socket.emit("newAnnouncementSocket", response.insertId);
    }
  }, [response]);

  const handleMonthChange = (direction) => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === "forward" ? 1 : -1));
      return newDate;
    });
  };

  function toggleDaySchedules(day) {
    let selectedDay;
    if (day) {
      selectedDay = new Date(selectedDate);
      selectedDay.setDate(day);
    }
    setAnnouncementDay(selectedDay);
    setAnnouncements(data?.announcements.filter(prev => String(prev.datetime.split(' ')[0]) === `${String(selectedDay?.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}-${selectedDay?.getFullYear()}`));
    if (isDayScheduleOpen) {
      setIsDayScheduleOpen(false);
      announcementRef.current.close();
    } else {
      setIsDayScheduleOpen(true);
      announcementRef.current.showModal();
    }
  }

  const renderDays = () => {
    const daysInMonth = getLastDayOfMonth(selectedDate.getFullYear(), selectedDate.getMonth());
    const firstDayOffset = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
    const today = new Date();
    const isToday = (day) =>
      today.getDate() === day &&
      today.getMonth() === selectedDate.getMonth() &&
      today.getFullYear() === selectedDate.getFullYear();
  
    return [
      ...Array(firstDayOffset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ].map((day, index) => (
      <button
        onClick={() => toggleDaySchedules(day)}
        key={index}
        className={`h-16 md:h-20 lg:h-24 grid grid-cols-2 hover:shadow-lg rounded-sm ${
          isToday(day) ? `text-${selectedTheme}-100 bg-gray-600 shadow-inner` : ""
        }`}
      >
        {day && <p className="text-xxs md:text-xs lg:text-sm font-normal p-[0.15rem]">{day}</p>}
        <div className="col-span-2 flex flex-col gap-[0.1rem] w-full py-2 md:p-2 lg:p-2">
          {data?.announcements &&
            data.announcements
              .filter((val) => {
                const announcementDate = new Date(val.datetime.split(' ')[0]);
                return (
                  announcementDate.getDate() === day &&
                  announcementDate.getMonth() === selectedDate.getMonth() &&
                  announcementDate.getFullYear() === selectedDate.getFullYear()
                );
              })
              .slice(0, 6)
              .map((_, i) => (
                <div key={i} className="p-[0.2rem] bg-blue-600 rounded-full w-full" />
              ))}
        </div>
      </button>
    ));
  };
  

  async function handleSubmit(e) {
    e.preventDefault();
    const curDateTime = new Date(announcementDay)
    curDateTime.setHours(payload.time.split(':')[0])
    curDateTime.setMinutes(payload.time.split(':')[1])
    const newPayload = {
      ...payload,
      dateTime: `${curDateTime.getFullYear()}-${String(curDateTime.getMonth() + 1).padStart(2, "0")}-${String(curDateTime.getDate()).padStart(2, "0")} ${String(curDateTime.getHours()).padStart(2, "0")}:${String(curDateTime.getMinutes()).padStart(2, "0")}:00`
    }
    await postData("addAnnouncement", newPayload);
    setPayload(null);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-col p-2 mb-4 mx-2 md:mx-3 lg:mx-4 mt-4">
        <Header title={ title } icon={<MdHome />}/>
        <div className="min-h-[70vh] md:min-h-[80vh] lg:min-h-[90vh] h-[70vh] md:h-[80vh] lg:h-[90vh] overflow-y-auto scroll-smooth p-2 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 h-auto w-full">

              {/* Calendar */}
              <div className={`flex flex-col p-1 shadow-md rounded-md`}>
                <p className="text-center font-bold text-base md:text-lg lg:text-xl p-1">Announcements & Schedule</p>
                <div className={`flex justify-between items-center p-2 tracking-tighter leading-tight font-medium rounded-md`}>
                  <button onClick={() => handleMonthChange("back")}>
                    <MdKeyboardArrowLeft className="text-xl" />
                  </button>
                  <p className="font-bold text-sm md:text-base lg:text-lg">
                    {selectedDate.toLocaleString("default", { month: "long", year: "numeric" })}
                  </p>
                  <button onClick={() => handleMonthChange("forward")}>
                    <MdKeyboardArrowRight className="text-xl" />
                  </button>
                </div>
                <div className="grid grid-cols-7 text-center font-semibold text-xs mb-2 p-2 border-b-[1px] border-black">
                  {weekDays.map((val, i) => (
                    <p key={i} className="text-xxs md:text-xs lg:text-sm">{val}</p>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">{renderDays()}</div>
              </div>

            </div>

            <div className="flex flex-col h-auto w-full gap-3">

              <DashIcon
                Icon={MdPeople}
                isLoading={isLoading}
                title={"On Queue"}
                value={data?.onQueue}
              />
              <DashIcon
                Icon={IoCalendar}
                isLoading={isLoading}
                title={"Upcoming Appointments"}
                value={data?.upcomingAppointments}
              />
              <div className={`flex flex-col gap-2 items-center justify-center h-auto w-full bg-${selectedTheme}-100 text-${selectedTheme}-800 rounded-md p-2 shadow-md`}>
                <p className="text-2xl font-semibold text-center italic leading-relaxed">
                  “{quote?.quote}”
                </p>
                <p className="text-lg text-center font-medium mt-4">
                  — {quote?.author}
                </p>
                <p className="text-sm text-center">
                  {quote?.date}
                </p>
              </div>

              <div
                className={`flex flex-col items-start justify-start gap-2 text-${selectedTheme}-800 font-semibold bg-${selectedTheme}-200 shadow-md p-1`}
              >
                <p className="text-xl text-center font-bold mt-4 w-full">
                  Emergency Contact Information:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-2 place-items-center justify-items-center list-disc text-lg w-full mb-4">
                  <div>
                    <span className="font-bold">GO Hotline Numbers:</span>
                    <ul className="pl-4 list-none">
                      <li>+63 917 808 0698</li>
                      <li>(043) 288 7771</li>
                      <li>(043) 288 7935</li>
                      <li>Email: <a href="mailto:GO@Ormindoro.gov.ph" className="text-blue-800 underline">GO@Ormindoro.gov.ph</a></li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold">Emergency Services:</span>
                    <ul className="pl-4 list-none">
                      <li>
                        <span className="font-bold">LGU Victoria:</span> +63 927 953 7268
                      </li>
                      <li>
                        <span className="font-bold">Police:</span> (043) 288 1616
                      </li>
                      <li>
                        <span className="font-bold">Fire:</span> (043) 288 5617
                      </li>
                      <li>
                        <span className="font-bold">Public Safety:</span> (043) 288 1111
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              
            </div>

          </div>
          <dialog 
            ref={announcementRef} 
            className={`rounded-lg bg-${selectedTheme}-100 drop-shadow-lg w-full md:w-[50vw] lg:w-[40vw] h-[60vh]`}
          >
            <div className="flex flex-col text-xs md:text-sm lg:text-base">
              <div
                className={`flex justify-between items-center p-2 text-${selectedTheme}-600 border-b-[1px] border-solid border-${selectedTheme}-500 shadow-md shadow-${selectedTheme}-600 mb-2`}
              >
              <div className="flex items-center p-1 gap-1">
                <HiSpeakerphone className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
                <strong className="font-semibold drop-shadow-md text-sm md:text-base lg:text-lg">
                  Announcements
                </strong>
              </div>
                <button
                  onClick={() => toggleDaySchedules()}
                  className={`transition-colors duration-200 rounded-3xl p-1 bg-${selectedTheme}-300 hover:bg-${selectedTheme}-400 active:bg-${selectedTheme}-200`}
                >
                  <MdClose className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
                </button>
              </div>
            </div>
            <div className="flex flex-col items-start justify-start gap-1">
              <div className={`flex justify-between items-center gap-3 px-2 border-b-[1px] border-${selectedTheme}-800 w-full`}>
                <div className={`p-2 font-bold text-${selectedTheme}-800 text-base flex gap-2`}>
                  <p className="text-xl">{String(new Date(announcementDay).toLocaleDateString('en-US', {day: "numeric", weekday: "long"})).split(' ')[0]}</p>
                  <p className="text-base self-end justify-self-end">{String(new Date(announcementDay).toLocaleDateString('en-US', {day: "numeric", weekday: "long"})).split(' ')[1]}</p>
                </div>
              </div>
              {isLoggedIn && (
              <form onSubmit={handleSubmit} className={`flex flex-wrap justify-start items-center gap-2 px-2 w-full border-b-[1px] border-${selectedTheme}-800 pb-1`}>
                <input 
                  type="text" 
                  name="title" 
                  id="title" 
                  placeholder="Title..."
                  className={`basis-1/4 bg-${selectedTheme}-200 text-${selectedTheme}-800 font-semibold text-xs md:text-sm lg:text-base rounded-md p-1`}
                  value={payload?.title || ""}
                  onChange={(e) => setPayload(prev => ({ ...prev, title: e.target.value }))}
                  maxLength={50}
                  required
                />
                <input 
                  type="text" 
                  name="details" 
                  id="details" 
                  placeholder="Details..."
                  className={`grow bg-${selectedTheme}-200 text-${selectedTheme}-800 font-semibold text-xs md:text-sm lg:text-base rounded-md p-1`}
                  value={payload?.details || ""}
                  onChange={(e) => setPayload(prev => ({ ...prev, details: e.target.value }))}
                  maxLength={255}
                  required
                />
                <input 
                  type="time" 
                  name="time" 
                  id="time" 
                  className={`basis-1/6 bg-${selectedTheme}-200 text-${selectedTheme}-800 font-semibold text-xs md:text-sm lg:text-base rounded-md p-1`}
                  value={payload?.time || ""}
                  onChange={(e) => setPayload(prev => ({ ...prev, time: e.target.value }))}
                  required
                />
                <button 
                  type="submit"
                  className={`transition-colors p-1 bg-${selectedTheme}-800 hover:bg-${selectedTheme}-700 active:bg-${selectedTheme}-200 text-${selectedTheme}-200 hover:text-${selectedTheme}-100 active:text-${selectedTheme}-800 rounded-md`}
                >
                  <FaPlus className="size-5" />
                </button>
              </form>
              )}
            </div>
            <div className="flex p-2 flex-col justify-start items-start gap-2">
              {announcements?.length > 0 ? announcements.map((val, i) => (
                <div key={i} className={`flex p-2 tracking-tight w-full`}>
                  <p className={`basis-1/5 border-r-2 border-blue-800 mr-1 pr-2 font-bold`}>{val.datetime.split(' ')[1]}</p>
                  <div className={`flex flex-col justify-start items-start p-2 font-semibold`}>
                    <p className={`mb-1 text-sm capitalize`}>{val.title}</p>
                    <p className={`text-xxs`}>{val.details}</p>
                  </div>
                  <button 
                    onClick={async () => {
                      await deleteData("deleteAnnouncement", val.announcement_id);
                      socket.emit("deleteAnnouncement", val.announcement_id);
                    }}
                    className={`self-center ml-auto text-${selectedTheme}-800 hover:text-${selectedTheme}-700 active:${selectedTheme}-200`}
                  >
                    <FaTrash />
                  </button>
                </div>
              )) : (
                <div className="flex flex-col min-w-full min-h-full items-center justify-center">
                  <p className={`text-${selectedTheme}-800 font-bold`}>No announcement or schedule for this day.</p>
                  {/* <button className={`text-blue-800 hover:text-blue-900 underline font-bold`}>Add an announcement now?</button> */}
                </div>
              )}
            </div>
          </dialog>
        </div>
      </div>
    </div>
  );
}

export default Home;