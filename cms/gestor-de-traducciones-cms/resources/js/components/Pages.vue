<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Pages</div>

                    <div class="card-body">
                        <EasyDataTable :headers="headers" :items="items" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import type { Header, Item } from "vue3-easy-data-table";

const headers: Header[] = [
    { text: "PLAYER", value: "player" },
    { text: "TEAM", value: "team" },
    { text: "NUMBER", value: "number" },
    { text: "POSITION", value: "position" },
    { text: "HEIGHT", value: "indicator.height" },
    { text: "WEIGHT (lbs)", value: "indicator.weight", sortable: true },
    { text: "LAST ATTENDED", value: "lastAttended", width: 200 },
    { text: "COUNTRY", value: "country" },
];

const items: Item[] = [
    { player: "Stephen Curry", team: "GSW", number: 30, position: 'G', indicator: { "height": '6-2', "weight": 185 }, lastAttended: "Davidson", country: "USA" },
    { player: "Lebron James", team: "LAL", number: 6, position: 'F', indicator: { "height": '6-9', "weight": 250 }, lastAttended: "St. Vincent-St. Mary HS (OH)", country: "USA" },
    { player: "Kevin Durant", team: "BKN", number: 7, position: 'F', indicator: { "height": '6-10', "weight": 240 }, lastAttended: "Texas-Austin", country: "USA" },
    { player: "Giannis Antetokounmpo", team: "MIL", number: 34, position: 'F', indicator: { "height": '6-11', "weight": 242 }, lastAttended: "Filathlitikos", country: "Greece" },
];

export default {
    name: 'pages',
    data() {
        return {
            headers: headers,
            items: items,
        }
    },
    mounted() {
        // console.log('About mounted.')
    }
}
</script>
<style lang="scss" scoped>
#main {
    width: 100%;
    display: block !important;
}

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
