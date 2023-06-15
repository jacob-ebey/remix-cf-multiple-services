import * as React from "react";

export function Counter() {
  const [count, setCount] = React.useState(0);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 space-y-4 bg-gray-100 border-2 border-gray-200 rounded-md">
      <div className="flex items-center justify-center w-12 h-12 text-2xl font-bold text-gray-800 bg-gray-200 rounded-full">
        {count}!
      </div>
      <div className="flex items-center justify-center space-x-2">
        <button
          className="w-6 h-6 text-gray-800 bg-gray-200 rounded-full"
          onClick={() => setCount(count - 1)}
        >
          -
        </button>
        <button
          className="w-6 h-6 text-gray-800 bg-gray-200 rounded-full"
          onClick={() => setCount(count + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
