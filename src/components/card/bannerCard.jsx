import { useNavigate } from "react-router-dom";
import Card from "components/card";
import { BsCheckCircleFill, BsXCircleFill, BsEye } from "react-icons/bs";
import PropTypes from 'prop-types';

const BannerCard = ({
  name,
  category,
  image,
  status = "available",
}) => {

  const statusConfig = {
    available: {
      icon: <BsCheckCircleFill className="w-3.5 h-3.5 text-green-500" />,
      text: "Available",
      textColor: "text-green-700 dark:text-green-400"
    },
    unavailable: {
      icon: <BsXCircleFill className="w-3.5 h-3.5 text-red-500" />,
      text: "Unavailable",
      textColor: "text-red-700 dark:text-red-400"
    }
  };

  const currentStatus = statusConfig[status?.toLowerCase()] || statusConfig.available;

  return (
    <Card
      extra="flex flex-col w-full h-full bg-white dark:bg-navy-800 rounded-[20px] shadow-md transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:-translate-y-2"
    >
      <div className="flex flex-col h-full">
        <div className="relative group h-[240px] sm:h-[260px] md:h-[280px]">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="w-full h-full overflow-hidden rounded-t-[20px]">
            <img
              src={image}
              className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
              alt={name}
              loading="lazy"
              crossOrigin="anonymous"
            />
          </div>

          {/* Status, Orders and Views Badges */}
          <div className="absolute top-3 left-3 right-3 z-20 flex justify-between">
            {/* Status Badge */}
            <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 backdrop-blur-sm dark:bg-navy-800/90">
              {currentStatus.icon}
              <p className={`text-sm font-medium ${currentStatus.textColor}`}>
                {currentStatus.text}
              </p>
            </div>

          </div>
        </div>

        {/* Content Container */}
        <div className="flex flex-col flex-grow p-5 space-y-4">
          {/* Product Info and Category with Orders */}
          <div>
            <h3 className="font-bold text-lg text-navy-700 dark:text-white line-clamp-1 group-hover:text-brand-500 transition-colors">
              {name}
            </h3>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {category}
              </p>
            </div>
          </div>

        </div>
        <div className="flex absolute bottom-4 right-2 gap-2">
          <button
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg flex items-center gap-1 transition-all duration-200 hover:shadow-md dark:bg-navy-700 dark:text-white dark:hover:bg-navy-600"
          >
            <BsEye className="w-3.5 h-3.5" />
            Details
          </button>
        </div>
      </div>
    </Card>
  );
};

BannerCard.propTypes = {
  name: PropTypes.string.isRequired,
  category: PropTypes.string.isRequired,
  image: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['available', 'unavailable']),
};

export default BannerCard;