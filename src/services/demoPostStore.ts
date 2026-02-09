// Simple in-memory store for demo posts
// In production, this would be replaced by real Irys queries

export interface DemoPost {
    id: string;
    latitude: number;
    longitude: number;
    photoUrl: string;
    memo: string;
    creator: string;
    timestamp: number;
    expiry: number;
    tips: number;
}

// Store for user-created posts during this session
let userCreatedPosts: DemoPost[] = [];

// Listeners for when posts change
let listeners: (() => void)[] = [];

export const demoPostStore = {
    // Add a new post
    addPost: (post: DemoPost) => {
        userCreatedPosts = [post, ...userCreatedPosts];
        // Notify all listeners
        listeners.forEach(listener => listener());
    },

    // Get all user-created posts
    getPosts: (): DemoPost[] => {
        return [...userCreatedPosts];
    },

    // Subscribe to changes
    subscribe: (listener: () => void) => {
        listeners.push(listener);
        // Return unsubscribe function
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    },

    // Clear all posts (useful for testing)
    clear: () => {
        userCreatedPosts = [];
        listeners.forEach(listener => listener());
    },
};
