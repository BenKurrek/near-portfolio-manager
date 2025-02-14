import React from "react";

interface SkeletonLoaderProps {
  width?: string;
  height?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = "100%",
  height = "1rem",
}) => {
  return (
    <div
      className="bg-gray-700 animate-pulse rounded"
      style={{ width, height }}
    ></div>
  );
};

export default SkeletonLoader;
