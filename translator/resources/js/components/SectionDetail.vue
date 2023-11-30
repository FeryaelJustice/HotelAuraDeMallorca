<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Section</div>

                    <div class="card-body">
                        <p>Section: '<b>{{ this.section.section_name }}</b>' of Page: '<b v-if="this.sectionPage">{{
                            this.sectionPage.name }}</b>'
                        </p>

                        <label for="langFilter">Filter by: language -></label>
                        <select id="langFilter" name="langFilter" v-model="langFilter">
                            <option value="">Select a language</option>
                            <option v-for="lang in langs" :key="lang.lang_code" :value="lang.lang_code">{{ lang.lang_name }}
                            </option>
                        </select>

                        <br />
                        <br />

                        <table class="table table-striped table-bordered" cellspacing="0" width="100%" id="tbl">
                            <thead>
                                <tr>
                                    <th>LITERAL ID</th>
                                    <th>LITERAL CODE</th>
                                    <th>LITERAL CONTENT</th>
                                    <th>LANG CODE</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item) in filteredItems" :key="item.id">
                                    <td>{{ item.id }}</td>
                                    <td>
                                        {{ item.code }}
                                    </td>
                                    <td>
                                        <template v-if="!item.editMode">{{ item.content }}</template>
                                        <template v-else>
                                            <textarea v-model="item.content" placeholder="Contenido del literal"
                                                style="height: 140px;"></textarea>
                                        </template>
                                    </td>
                                    <td>{{ item.lang_code }}</td>
                                    <td>
                                        <input type="checkbox" id="edit" name="edit" v-model="item.editMode"
                                            @change="toggleEditMode(item)" />
                                        <label for="edit">Edit?</label>
                                        <!-- Show the "Save Changes" button only for rows in edit mode -->
                                        <button v-if="item.editMode" @click="saveChanges(item)">Save Changes</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import axios from "axios";
const API_URL = "/api";
export default {
    name: 'sections/:id',
    data() {
        return {
            section: {}, // data de la seccion
            sectionPage: {}, // data de la pagina a la que pertenece la seccion
            items: [], // items de la tabla (literales)
            originalData: [], // Added to store the original data for each row
            langs: [], // Added to store the languages
            langFilter: '', // Added to filter the languages
        }
    },
    computed: {
        filteredItems() {
            // If no language filter is selected, return all items
            if (!this.langFilter) {
                return this.items;
            }

            // Filter items based on the selected language
            return this.items.filter(item => item.lang_code === this.langFilter);
        }
    },
    methods: {
        toggleEditMode(item) {
            const originalIndex = this.originalData.findIndex(originalItem => originalItem.id === item.id);

            // Here we need to only disable the edit mode for the rest of the literals
            this.items.forEach((item, i) => {
                if (i !== originalIndex) {
                    item.editMode = false;
                }
            });

            // If disable edit mode, restore item to the original data
            if (!this.items[originalIndex].editMode) {
                this.items[originalIndex] = Object.assign({}, this.originalData[originalIndex]);
            }
        },
        saveChanges(item) {
            // Access the modified data from this.items[index]

            // Make API call to save the changes for the specific row
            if (item.code !== '') {
                // Example API call (replace with your actual API endpoint and data)
                axios.put(API_URL + '/translations/updateLiteral', item)
                    .then(response => {
                        // Exit edit mode
                        item.editMode = false;
                        if (response && response.data) {
                            alert(response.data.message);
                            axios.get(API_URL + '/pages/domainAndApiKey/' + this.sectionPage.page_id).then(async response => {
                                const apiKey = response.data.data.apiKey;
                                const domain = response.data.data.domain;

                                if (domain) {
                                    const formData = new FormData();
                                    formData.append('translatorKey', apiKey);
                                    // if (this.sectionPage.name == 'Intranet Vacalia') {
                                    await axios.post(`${domain}/updates.php`, formData)
                                    // }
                                }
                            }).catch(error => { console.log(error) })
                        }
                    })
                    .catch(error => {
                        console.log(error);
                        if (error && error.response && error.response.data) {
                            alert(error.response.data.error.errorInfo)
                        }
                    });
            } else {
                alert('El código no puede estar vacío')
            }

        },
    },

    mounted() {
        // Get langs
        axios.get(API_URL + '/languages').then(response => {
            this.langs = response.data.data;
        }).catch(error => { console.log(error) })

        const sectionId = this.$route.params.id;

        // Get section data
        axios.get(API_URL + '/sections/' + sectionId).then(response => {
            this.section = response.data.data;
            // Get the page data for the section
            axios.get(API_URL + '/pages/section/' + sectionId).then(response => {
                this.sectionPage = response.data.data[0]

                axios.get(API_URL + '/translations/' + this.sectionPage.page_id + '/' + sectionId).then(response => {
                    response.data.data.forEach(async (sectionLiteral) => {
                        const item = sectionLiteral;
                        item.editMode = false;
                        this.items.push(item)
                        // Deep copy of the original data
                        this.originalData.push({ ...item });
                    })
                    // Order array objects
                    Object.values(this.items).sort((a, b) => a.section_id - b.section_id)
                    Object.values(this.originalData).sort((a, b) => a.section_id - b.section_id);
                }).catch(error => { console.log(error) })

                // Get the page sections for the select
                // axios.get(API_URL + '/sections/pageSections/' + this.sectionPage.page_id).then(response => {
                //     response.data.data.forEach((section, index) => {
                //         axios.get(API_URL + '/translations/' + this.sectionPage.page_id + '/' + section.id).then(response => {
                //             response.data.data.forEach(async (sectionLiteral) => {
                //                 const item = sectionLiteral;
                //                 item.editMode = false;
                //                 this.items.push(item)
                //                 // Deep copy of the original data
                //                 this.originalData.push({ ...item });
                //             })
                //         }).catch(error => { console.log(error) })
                //     })

                //     // Order array objects
                //     Object.values(this.items).sort((a, b) => a.section_id - b.section_id)
                //     Object.values(this.originalData).sort((a, b) => a.section_id - b.section_id);
                // }).catch(error => { console.log(error) })
            }).catch(error => {
                console.log(error)
            })
        }).catch(error => {
            console.log(error)
        })

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
