//VUE ROUTER
import { createRouter, createWebHistory } from 'vue-router'
import App from '../App.vue'
import ExampleComponent from '../components/ExampleComponent.vue'

const routes = [
    { path: '/', name: 'home', component: App },
    { path: '/example', component: ExampleComponent },
]
const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router;
