//VUE ROUTER
import { createRouter, createWebHistory } from 'vue-router'
import Home from './../components/Home.vue'
import About from './../components/About.vue'
import Pages from './../components/Pages.vue'

const routes = [
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/pages', component: Pages },
]
const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router;
