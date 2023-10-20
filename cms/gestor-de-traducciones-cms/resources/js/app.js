import './bootstrap';
import "bootstrap";

import { createApp } from 'vue';
import Home from './components/Home.vue'
import About from './components/About.vue'

//VUE ROUTER
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    { path: '/', component: Home },
    { path: '/about', component: About },
]
const router = createRouter({
    history: createWebHistory(),
    routes,
})

const app = createApp({});
app.use(router)
app.mount('#app');
