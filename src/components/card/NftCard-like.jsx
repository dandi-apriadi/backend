import { useNavigate } from "react-router-dom";
import Card from "components/card";
import { BsCheckCircleFill, BsXCircleFill, BsEye, BsCart4, BsStar, BsStarFill, BsStarHalf, BsHeart, BsArrowLeft, BsCheckCircle, BsFileText, BsGift, BsPlus, BsDash, BsBagCheck, BsArrowRight, BsHeartFill } from "react-icons/bs";
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { API_CONFIG } from "../../config/apiConfig";
import axios from "axios";

const NftCard = ({
  name,
  category,
  price,
  image,
  status = "available",
  url,
  productId, // Add productId prop
  totalOrders = 0,
  description = "No description available",
  benefits = [], // Direct array of benefits
  onCartClick,
  onBuyNowClick,
  isLiked, // Add isLiked prop
  onLikeChange // Add callback prop
}) => {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);
  const [liked, setLiked] = useState(isLiked); const [isLoading, setIsLoading] = useState(false);
  const user = useSelector((state) => state.auth.user);

  const formatPrice = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(number);
  };

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

  const StarRating = () => (
    <div className="flex items-center gap-0.5">
      <BsStarFill className="w-3 h-3 text-yellow-400" />
      <BsStarFill className="w-3 h-3 text-yellow-400" />
      <BsStarFill className="w-3 h-3 text-yellow-400" />
      <BsStarHalf className="w-3 h-3 text-yellow-400" />
      <BsStar className="w-3 h-3 text-yellow-400" />
      <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">(4.5)</span>
    </div>
  );

  const handleLikeAction = async (e) => {
    e.stopPropagation();

    if (!user) {
      navigate('/auth/sign-in');
      return;
    }

    try {
      setIsLoading(true);
      if (liked) {
        await handleUnlike();
      } else {
        await handleLike();
      }
    } catch (error) {
      console.error('Error handling like:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleLike = async () => {
    try {
      const response = await axios.post(`${API_CONFIG.API_URL}/product/like/${productId}`, {
        product_id: productId,
        user_id: user.id
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.data.status === 'success') {
        setLiked(true);
        onLikeChange?.(true);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/login');
      }
      console.error('Error liking product:', error);
    }
  };
  const handleUnlike = async () => {
    try {
      const response = await axios.delete(`${API_CONFIG.API_URL}/product/unlike/${productId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        data: {
          product_id: productId,
          user_id: user.id
        }
      });

      if (response.data.status === 'success') {
        setLiked(false);
        onLikeChange?.(false);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/login');
      }
      console.error('Error unliking product:', error);
    }
  };

  return (
    <div className="perspective-1000">
      <div
        className={`relative w-full h-full transition-transform duration-500 preserve-3d cursor-pointer
          ${isFlipped ? 'rotate-y-180' : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front Card */}
        <div className="relative inset-0 backface-hidden">
          <Card
            extra="flex flex-col w-full h-full border bg-white dark:bg-navy-800 rounded-[20px] shadow-md transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:-translate-y-2"
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

                  <div className="flex gap-2">

                    {/* Views Badge */}
                    <div
                      onClick={handleLikeAction}
                      className={`flex items-center gap-1.5 rounded-full bg-white/90 
                        px-2 py-1.5 backdrop-blur-sm dark:bg-navy-800/90 cursor-pointer
                        hover:scale-105 transition-transform duration-200
                        ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      {liked ? (
                        <BsHeartFill className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <BsHeart className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
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
                    <div className="flex items-center gap-1.5">
                      <BsBagCheck className="w-3.5 h-3.5 text-brand-500" />
                      <span className="text-sm font-medium text-navy-700 dark:text-white">
                        {totalOrders}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating and Price Section */}
                <div className="flex flex-col gap-4 mt-auto pt-4 border-t border-gray-100 dark:border-navy-700">
                  {/* Star Rating */}
                  <div className="flex justify-center">
                    <StarRating />
                  </div>

                  {/* Price and Actions Container */}
                  <div className="flex flex-col gap-4">
                    {/* Price Section */}
                    <div className="w-full">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Price
                      </p>
                      <p className="text-xl font-bold text-navy-700 dark:text-white mt-1">
                        {formatPrice(price)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCartClick();
                        }}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 
                          text-gray-700 text-xs font-medium rounded-lg flex items-center 
                          justify-center gap-1.5 transition-all duration-200 hover:shadow-md 
                          dark:bg-navy-700 dark:text-white dark:hover:bg-navy-600"
                      >
                        <BsCart4 className="w-3.5 h-3.5" />
                        Cart
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBuyNowClick();
                        }}
                        className="px-3 py-2 bg-brand-500 hover:bg-brand-600 
                          text-white text-xs font-medium rounded-lg flex items-center 
                          justify-center gap-1.5 transition-all duration-200 hover:shadow-md"
                      >
                        <BsArrowRight className="w-3.5 h-3.5" />
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </Card>
        </div>

        {/* Back Card */}
        <div className="absolute inset-0 rotate-y-180 backface-hidden">
          <Card extra="flex flex-col w-full h-full border bg-white/95 dark:bg-navy-800/95 
            backdrop-blur-sm rounded-[20px] shadow-xl overflow-hidden">
            <div className="relative h-full flex flex-col">
              {/* Header with Back Button and Details */}
              <div className="relative px-4 py-3 border-b border-gray-100 dark:border-navy-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFlipped(false);
                      }}
                      className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 
                        dark:bg-navy-700 dark:hover:bg-navy-600 transition-colors"
                    >
                      <BsArrowLeft className="w-3.5 h-3.5 text-gray-700 dark:text-white" />
                    </button>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Product Overview
                    </h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(url);
                    }}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl 
                      bg-gradient-to-r from-brand-500/5 via-purple-500/5 to-brand-500/5
                      hover:from-brand-500/10 hover:via-purple-500/10 hover:to-brand-500/10
                      border border-brand-500/10 hover:border-brand-500/20
                      transition-all duration-300 ease-in-out transform hover:scale-[1.02]"
                  >
                    <BsEye className="w-3.5 h-3.5 text-brand-500 transition-transform 
                      duration-300" />
                    <span className="text-xs font-medium text-brand-500">
                      Details
                    </span>
                  </button>
                </div>
              </div>

              {/* Content Container */}
              <div className="flex-1 p-4 overflow-y-auto scrollbar-hide space-y-4">
                {/* Description Section */}
                <div className="relative overflow-hidden backdrop-blur-xl bg-white/30 dark:bg-navy-800/30 
                    rounded-xl p-3 border border-gray-200/50 dark:border-navy-700/50 
                    hover:shadow-lg transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 
                        dark:from-blue-900/20 dark:to-purple-900/20 pointer-events-none" />
                  <div className="relative">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white 
                            flex items-center gap-1.5 mb-2">
                      <div className="p-1 bg-brand-500/10 rounded-md">
                        <BsFileText className="w-3 h-3 text-brand-500" />
                      </div>
                      Description
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {description || "No description available"}
                    </p>
                  </div>
                </div>

                {/* What You Get Section */}
                <div className="relative overflow-hidden backdrop-blur-xl bg-white/30 dark:bg-navy-800/30 
                    rounded-xl p-3 border border-gray-200/50 dark:border-navy-700/50">
                  <div className="relative">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white 
                            flex items-center gap-1.5 mb-2">
                      <div className="p-1 bg-brand-500/10 rounded-md">
                        <BsGift className="w-3 h-3 text-brand-500" />
                      </div>
                      Product Benefits
                    </h4>
                    <ul className="space-y-2">
                      {benefits && benefits.length > 0 ? benefits.map((benefit, index) => (
                        <li key={index}
                          className="flex items-center gap-2 p-1.5 hover:bg-white/50 
                                dark:hover:bg-navy-700/50 rounded-lg transition-all duration-200">
                          <div className="w-6 h-6 rounded-md bg-brand-500/10 
                                flex items-center justify-center">
                            <BsCheckCircle className="w-3 h-3 text-brand-500" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {benefit.name}
                          </span>
                        </li>
                      )) : (
                        <li className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                          No benefits listed
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
                <div className="mt-auto">
                  <button
                    onClick={() => navigate(url)}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 
                      text-sm font-medium rounded-lg flex items-center justify-center gap-2 
                      transition-all duration-200 hover:shadow-md 
                      dark:bg-navy-700 dark:text-white dark:hover:bg-navy-600"
                  >
                    <BsEye className="w-4 h-4" />
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

NftCard.propTypes = {
  name: PropTypes.string.isRequired,
  category: PropTypes.string.isRequired,
  price: PropTypes.number.isRequired,
  image: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['available', 'unavailable']),
  url: PropTypes.string.isRequired,
  productId: PropTypes.string.isRequired,
  totalViews: PropTypes.number,
  totalOrders: PropTypes.number,
  checkout: PropTypes.string,
  description: PropTypes.string,
  benefits: PropTypes.arrayOf(PropTypes.string), // Add benefits to prop types
  onCartClick: PropTypes.func.isRequired,
  onBuyNowClick: PropTypes.func.isRequired,
  isLiked: PropTypes.bool, // Add isLiked to prop types
  onLikeChange: PropTypes.func
};

export default NftCard;