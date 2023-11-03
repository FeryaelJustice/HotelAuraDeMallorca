//VUE ROUTER
import { createRouter, createWebHistory } from 'vue-router'
import Home from './../components/Home.vue'
import About from './../components/About.vue'
import Pages from './../components/Pages.vue'
import PageDetail from './../components/PageDetail.vue'
import NotFound from './../components/NotFound.vue';

const routes = [
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/pages', component: Pages },
    { path: '/pages/:id', component: PageDetail },
    { path: '/:pathMatch(.*)', component: NotFound },
]
const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router;
