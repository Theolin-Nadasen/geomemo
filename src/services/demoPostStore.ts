// Simple in-memory store for demo posts
// Real mode uses Supabase instead

export type ImageType = 'good' | 'bad' | 'general';

export interface DemoPost {
    id: string;
    latitude: number;
    longitude: number;
    image_type: ImageType;
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

    // Update tips for a post
    updatePostTips: (postId: string, amount: number) => {
        const postIndex = userCreatedPosts.findIndex(p => p.id === postId);
        if (postIndex !== -1) {
            userCreatedPosts[postIndex] = {
                ...userCreatedPosts[postIndex],
                tips: userCreatedPosts[postIndex].tips + amount
            };
            // Notify all listeners
            listeners.forEach(listener => listener());
        }
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
