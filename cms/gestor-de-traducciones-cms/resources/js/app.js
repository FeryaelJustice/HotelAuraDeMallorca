import './bootstrap';
import "bootstrap";

import { createApp } from 'vue';
//VUE ROUTER
import router from './router'

const app = createApp({});
app.use(router)
app.mount('#app');
