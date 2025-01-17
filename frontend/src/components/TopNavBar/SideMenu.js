import { useContext, useEffect, useState } from "react";
import { MdHome, MdSpaceDashboard, MdFolder, MdAnalytics, MdLocalPharmacy, MdPeople, MdOutlineSmartToy, MdKeyboardArrowDown, MdHistoryEdu, MdInsights } from "react-icons/md";
import { FaCode, FaMapMarkedAlt, FaStethoscope, FaStore, FaUsers } from "react-icons/fa";
import { BiSolidDonateBlood, BiSolidLogInCircle } from "react-icons/bi";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { accessibilityContext, colorTheme, isLoggedInContext } from "../../App";
import { IoCalendar } from "react-icons/io5";
import { jwtDecode } from "jwt-decode";
import { GoReport } from "react-icons/go";
import useIndexedDB from "../../hooks/useIndexedDb";
import { GiHamburgerMenu } from "react-icons/gi";

const Menu = ({ path, Icon, label, isMinimized }) => {
  const [selectedTheme] = useContext(colorTheme);
  const [jump, setJump] = useState({
    Home: false,
    Dashboard: false,
    Analytics: false,
    Records: false,
    Pharmacy: false,
    BloodUnit: false,
  });
  const location = useLocation();
  const loc = location.pathname;

  const handleClick = () => {
    setJump((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <Link
      to={path}
      onClick={handleClick}
      className={`m-1 md:m-2 lg:m-2 ${!isMinimized ? 'px-2 md:px-4 lg:px-10' : ''} p-2 gap-1 rounded-lg transition-colors hover:text-${selectedTheme}-600 hover:bg-${selectedTheme}-50 hover:drop-shadow-md first-line duration-300 ease-linear ${
        loc === `/${path}`
          ? `bg-${selectedTheme}-100 drop-shadow-xl`
          : `bg-transparent`
      }`}
    >
      <div
        className={`${!isMinimized && 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3'} justify-start items-center ${
          jump[label] && 'animate-jump'
        }`}
        onAnimationEnd={handleClick}
      >
        <Icon className={`size-5 md:size-5 lg:size-6`} />
        {!isMinimized && (
        <p className={`col-span-2 hidden md:block lg:block`} onAnimationEnd={handleClick}>
          {label}
        </p>
        )}
      </div>
    </Link>
  );
};

const SideMenu = () => {
  const [userAccessibilities] = useContext(accessibilityContext);
  const [isDevMenuOpen, setIsDevMenuOpen] = useState(false);
  const [isDashboardListOpen, setIsDashboardListOpen] = useState(false);
  const location = useLocation();
  const loc = location.pathname;
  const { getAllItems } = useIndexedDB();
  const [idbAccessToken, setIdbAccessToken] = useState(null);
  const navigate = useNavigate();
  const [isMinimized, setIsMinimized] = useState(false);
  
  async function getTokens() {
    const tokens = await getAllItems('tokens');
    setIdbAccessToken(tokens.accessToken);
  }
  useEffect(() => {
    getTokens();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const role = idbAccessToken ? jwtDecode(idbAccessToken).role : "";

  const [selectedTheme] = useContext(colorTheme);
  const [isLoggedIn] = useContext(isLoggedInContext);
  
  return (
    <div className={`flex flex-col bg-${selectedTheme}-300 text-${selectedTheme}-800 font-semibold leading-tight tracking-tight text-nowrap overflow-y-auto overflow-x-hidden w-full`}>
      <button onClick={() => setIsMinimized(prev => !prev)} className={`hidden md:block lg:block self-start justify-self-start m-1 md:m-2 lg:m-2 p-2 gap-1 rounded-lg transition-colors hover:text-${selectedTheme}-600 hover:bg-${selectedTheme}-50 hover:drop-shadow-md first-line duration-300 ease-linear`}>
        <GiHamburgerMenu className="size-5 md:size-5 lg:size-6"/> 
      </button>
      {isLoggedIn ? (
        <>
        <Menu path="home" Icon={MdHome} label={!isMinimized && 'Home'} isMinimized={isMinimized}/>
        <div className={`flex flex-col ${isDashboardListOpen && `bg-${selectedTheme}-50`}`}>
          <div className={`hover:cursor-pointer m-1 ${!isMinimized && 'px-2 md:px-4 lg:px-10'} p-2 gap-1 rounded-lg transition-colors bg-${selectedTheme}-300 hover:text-${selectedTheme}-600 hover:bg-${selectedTheme}-50 hover:drop-shadow-md first-line duration-300 ease-linear ${
            isDashboardListOpen || loc === '/dashboard' ? `bg-${selectedTheme}-50 drop-shadow-xl` : `bg-transparent`
          }`}>
            <div className={!isMinimized ? `grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-1` : 'flex flex-col items-center justify-between gap-[0.10rem]'}>
              <MdSpaceDashboard className={`size-5 md:size-5 lg:size-6`} onClick={() => navigate('/dashboard')} />
              {!isMinimized && (
              <p onClick={() => navigate('/dashboard')} className={`col-span-1 md:col-span-2 lg:col-span-2 hidden md:block lg:block`}>
                Dashboard
              </p>
              )}
              <button 
                className={`${isDashboardListOpen ? 'rotate-180' : ''} size-5 md:size-5 lg:size-6 ${!isMinimized && 'md:ml-2 lg:ml-2'}`} 
                onClick={() => setIsDashboardListOpen(prev => !prev)}
              >
                <MdKeyboardArrowDown className="w-full h-full"/>
              </button>
            </div>
          </div>
          {isDashboardListOpen && (
            <>
            <Menu path="analytics" Icon={MdAnalytics} label={!isMinimized && 'Analytics'} isMinimized={isMinimized}/>
            <Menu path="insights_and_predictions" Icon={MdInsights} label={!isMinimized && 'Insights'} isMinimized={isMinimized}/>
            <Menu path="mapping" Icon={FaMapMarkedAlt} label={!isMinimized && 'Mapping'} isMinimized={isMinimized}/>
            </>
          )}
        </div>
        {/* {Boolean(userAccessibilities?.access_appointments.access) && (
          <Menu path="appointments" Icon={IoCalendar} label={!isMinimized && 'Appointments'} isMinimized={isMinimized}/>
        )}
        {Boolean(userAccessibilities?.access_queue.access) && (
          <Menu path="queue" Icon={MdPeople} label={!isMinimized && 'Queues'} isMinimized={isMinimized}/>
        )} */}
        <Menu path="appointments" Icon={IoCalendar} label={!isMinimized && 'Appointments'} isMinimized={isMinimized}/>
        <Menu path="queue" Icon={MdPeople} label={!isMinimized && 'Queues'} isMinimized={isMinimized}/>
        <Menu path="records" Icon={MdFolder} label={!isMinimized && 'Records'} isMinimized={isMinimized}/>
        <Menu path="historical_data" Icon={MdHistoryEdu} label={!isMinimized && 'Historical Data'} isMinimized={isMinimized}/>
        <Menu path="pharmacy" Icon={MdLocalPharmacy} label={!isMinimized && 'Pharmacy'} isMinimized={isMinimized}/>
        <Menu path="equipments" Icon={FaStethoscope} label={!isMinimized && 'Equipments'} isMinimized={isMinimized}/>
        <Menu path="blood_unit" Icon={BiSolidDonateBlood} label={!isMinimized && 'Blood Unit'} isMinimized={isMinimized}/>
        {role && (role !== 'staff') && (
          <Menu path="accounts" Icon={FaUsers} label={!isMinimized && 'Accounts'} isMinimized={isMinimized}/>
        )}

        {role && role === 'developer' && (
          <>
            <button onClick={() => setIsDevMenuOpen(prev => !prev)} className={`m-1 ${!isMinimized && 'px-2 md:px-4 lg:px-10'} p-2 gap-1 rounded-lg transition-colors bg-${selectedTheme}-300 hover:text-${selectedTheme}-600 hover:bg-${selectedTheme}-50 hover:drop-shadow-md first-line duration-300 ease-linear ${
              isDevMenuOpen || loc === '/playground-jwt' || loc === '/playground-socket' ? `bg-${selectedTheme}-50 drop-shadow-xl` : `bg-transparent`
            }`}>
              <div className={!isMinimized ? `grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-1` : 'flex flex-col items-center justify-between gap-[0.10rem]'}>
                <FaCode className={`size-5 md:size-5 lg:size-6`} />
                {!isMinimized && (
                <p className={`col-span-1 md:col-span-2 lg:col-span-2 hidden md:block lg:block`}>
                  Developer
                </p>
                )}
                <MdKeyboardArrowDown className={`${isDevMenuOpen && 'rotate-180'} size-5 md:size-5 lg:size-6 hidden md:block lg:block ${!isMinimized && 'md:ml-2 lg:ml-2'}`} />
              </div>
            </button>
            {isDevMenuOpen && (
              <>
                <Menu path="playground-jwt" Icon={MdOutlineSmartToy} label={!isMinimized && 'JWT'} isMinimized={isMinimized}/>
                <Menu path="indexed-db" Icon={FaStore} label={!isMinimized && 'IDB'} isMinimized={isMinimized}/>
                <Menu path="problems" Icon={GoReport} label={!isMinimized && 'Problems'} isMinimized={isMinimized}/>
              </>
            )}
          </>
        )}
        </>
      ) : (
        <>
        <Menu path="home" Icon={MdHome} label={!isMinimized && 'Home'} isMinimized={isMinimized}/>
        <Menu path="queue" Icon={MdPeople} label={!isMinimized && 'Queues'} isMinimized={isMinimized}/>
        <Menu path="dashboard" Icon={MdSpaceDashboard} label={!isMinimized && 'Dashboard'} isMinimized={isMinimized}/>
        <Menu path="analytics" Icon={MdAnalytics} label={!isMinimized && 'Analytics'} isMinimized={isMinimized}/>
        </>
      )}
      {!isLoggedIn && (
        <Menu path="login" Icon={BiSolidLogInCircle} label={!isMinimized && 'Login'} isMinimized={isMinimized}/>
      )}
      <Outlet />
    </div>
  );
};

export default SideMenu;
