<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Page</div>

                    <div class="card-body">
                        <p>Page ID: {{ this.$route.params.id }}</p>
                        <EasyDataTable :headers="headers" :items="items" buttons-pagination show-index
                            @click-row="rowSelected" />
                        <!--
                        <div class="addSection">
                            <br>
                            <h4>Create a section</h4>
                            <select name="addSection_select" id="addSection_select" v-model="selectedPageID">
                                <option disabled key="-1" value="-1">Please select an option</option>
                                <option v-for="page in pages" :key="page.id" :value="page.id">{{ page.name }}
                                </option>
                            </select>
                            <input type="text" placeholder="Section name" maxlength="500" v-model="newSectionName">
                            <button @click="handleNewSection">Crear sección</button>
                        </div>
                        -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { RouterLink } from 'vue-router';
import type { Header, Item, ClickRowArgument } from "vue3-easy-data-table";
import axios from "axios";
const API_URL = "/api";

const headers: Header[] = [
    { text: "ID", value: "id" },
    { text: "SECTION NAME", value: "section_name" },
    { text: "SECTION PARENT ID", value: "section_parent" }
];

export default {
    name: 'pages/:id',
    components: {
        RouterLink,
    },
    data() {
        return {
            headers: headers,
            items: [],
            // pages: [] as Array<{ id: number, name: string }>,
            // selectedPageID: this.pages && this.pages.length > 0 ? this.pages[0].id : -1,
            // newSectionName: '' as String,
        }
    },
    methods: {
        rowSelected(item: ClickRowArgument) {
            const id = item.id;
            this.$router.push(`/sections/${id}`)
        },
        /*
        handleNewSection() {
            if (this.selectedPageID != -1 && this.newSectionName != '') {
                axios.post(API_URL + '/sections/new', { data: { pageID: this.selectedPageID, newSectionName: this.newSectionName } }).then(response => {
                    if (response && response.status == 200) {
                        alert("New section created")
                        this.resetNewSection();
                    } else {
                        alert('Error creating new section')
                    }
                }).catch(error => {
                    alert('Error creating new section')
                    console.log(error)
                })
            } else {
                alert('Página o nombre de la sección inválidos')
            }
        },
        resetNewSection() {
            this.selectedPageID = this.pages && this.pages.length > 0 ? this.pages[0].id : -1;
            this.newSectionName = '';
        }
        */
    },
    mounted() {
        // console.log('Pages mounted.')
        const pageId = this.$route.params.id;

        axios.get(API_URL + '/sections/pageSections/' + pageId).then(response => {
            this.items = response.data.data;
        }).catch(error => { console.log(error) })

        // For adding a new section
        /*
        axios.get(API_URL + '/pages').then(response => {
            this.pages = response.data.data;
        }).catch(error => { console.log(error) })
        */
    }
}
</script>
<style lang="scss" scoped>
.card {
    min-height: 80vh;

    .card-body>div {
        min-height: 100%;
    }
}

.card-header {
    width: 100%;
    text-align: center;
}
</style>
