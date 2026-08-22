import { useState } from "react";
import Stock from "./stock";
import Orders from "./Orders";
import "../styles/shipping.css";

export default function Shipping() {
const [activeTab, setActiveTab] = useState("orders");

const handleTouchStart = (e) => {
window.touchStartX = e.touches[0].clientX;
};

const handleTouchEnd = (e) => {
const touchEndX = e.changedTouches[0].clientX;
const difference = window.touchStartX - touchEndX;

// Swipe left → Orders
if (difference > 70 && activeTab === "stock") {
    setActiveTab("orders");
}

// Swipe right → Stock
if (difference < -70 && activeTab === "orders") {
    setActiveTab("stock");
}
};

return (
<div className="shipping-page">
    {/* Header */}
    <div className="shipping-header">
    <div>
        <h1>Shipping</h1>
        <p>Manage your stock and orders</p>
    </div>
    </div>

    {/* Tabs */}
    <div className="shipping-tabs">
    <button
        className={activeTab === "stock" ? "active" : ""}
        onClick={() => setActiveTab("stock")}
    >
        Stock
    </button>

    <button
        className={activeTab === "orders" ? "active" : ""}
        onClick={() => setActiveTab("orders")}
    >
        Orders
    </button>
    </div>

    {/* Swipe Area */}
    <div
    className="shipping-content"
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
    >
    <div
        className={`shipping-slider ${
        activeTab === "orders" ? "show-orders" : ""
        }`}
    >
        <div className="shipping-slide">
        <Stock />
        </div>

        <div className="shipping-slide">
        <Orders />
        </div>
    </div>
    </div>
</div>
);
}