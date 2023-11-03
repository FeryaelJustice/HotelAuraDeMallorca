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
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { RouterLink } from 'vue-router';
import type { Header, Item, ClickRowArgument } from "vue3-easy-data-table";

const headers: Header[] = [
    { text: "ID", value: "id" },
    { text: "SECTION NAME", value: "section_name" }
];

const items: Item[] = [
    { id: "Stephen Curry", section_name: "GSW" },
    { id: "Lebron James", section_name: "LAL" },
    { id: "Kevin Durant", section_name: "BKN" },
    { id: "Giannis Antetokounmpo", section_name: "MIL" },
];

export default {
    name: 'page/:id',
    components: {
        RouterLink,
    },
    data() {
        return {
            headers: headers,
            items: items,
        }
    },
    methods: {
        rowSelected(item: ClickRowArgument) {
            console.log(item)
            const id = item.id;
            this.$router.push(`/sections/${id}`)
        }
    },
    mounted() {
        // console.log('Pages mounted.') 
        const pageId = this.$route.params.id;
        console.log('Page ID:', pageId);
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
