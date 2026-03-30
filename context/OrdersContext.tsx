import React, { createContext, useContext, useState, ReactNode } from "react";

/* ================= TYPES ================= */

export type Order = {
    id: string;
    title: string;
    subtitle: string;
    date: string;
};

type OrdersContextType = {
    orders: Order[];
    addOrder: (data: { title: string; subtitle: string }) => void;
    clearOrders: () => void;
};

/* ================= CONTEXT ================= */

const OrdersContext = createContext<OrdersContextType | undefined>(
    undefined
);

/* ================= PROVIDER ================= */

export function OrdersProvider({ children }: { children: ReactNode }) {
    const [orders, setOrders] = useState<Order[]>([]);

    const addOrder = ({ title, subtitle }: { title: string; subtitle: string }) => {
        const newOrder: Order = {
            id: Date.now().toString(),
            title,
            subtitle,
            date: new Date().toLocaleString(),
        };

        setOrders((prev) => [newOrder, ...prev]);
    };

    const clearOrders = () => {
        setOrders([]);
    };

    return (
        <OrdersContext.Provider value={{ orders, addOrder, clearOrders }}>
            {children}
        </OrdersContext.Provider>
    );
}

/* ================= CUSTOM HOOK ================= */

export function useOrders() {
    const context = useContext(OrdersContext);

    if (!context) {
        throw new Error("useOrders must be used inside OrdersProvider");
    }

    return context;
}