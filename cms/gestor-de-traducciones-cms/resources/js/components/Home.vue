<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Formulario de gestor de traducciones para tu web</div>

                    <div class="card-body">
                        <h2>Inserta tus traducciones</h2>
                        <span><em>No debes poner un código de literal que esté ya en la base de datos.</em></span>
                        <form action="" id="form" @submit.prevent="onSubmit">
                            <fieldset>
                                <legend>Página</legend>
                                <label for="pageSelect">Página</label>
                                <select v-model="selectedPageId" id="pageSelect" name="pageSelect" required>
                                    <option v-for="page in pages" :key="page.id" :value="page.id">
                                        {{ page.app_page_name }}
                                    </option>
                                </select>
                            </fieldset>
                            <fieldset>
                                <legend>Sección</legend>
                                <label for="sectionSelect">Sección de la página</label>
                                <select v-model="selectedSectionId" id="sectionSelect" name="sectionSelect" required>
                                    <option v-for="section in filteredSections" :key="section.id" :value="section.id">
                                        {{ section.page_name + ' - ' + section.section_name }}
                                    </option>
                                </select>
                            </fieldset>
                            <fieldset v-if="languages && languages[0]">
                                <legend>Traducciones</legend>
                                <div class="languageSelect">
                                    <div class="myRow">
                                        <div v-for="language in languages" :key="language.lang_code">
                                            <button type="button" class="btn btn-dark btn-space"
                                                @click="changeLanguageFields(language.lang_code)"
                                                :class="{ 'btn-selected': language.lang_code === currentLanguage }">{{
                                                    language.lang_name }}</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="language-selection" v-for="language in languages" :key="language.lang_code">
                                    <transition name="fade">
                                        <div v-if="language.lang_code == currentLanguage">
                                            <br>
                                            <div class="literal">
                                                <span>{{ language.lang_name }}</span>
                                                <label :for="'literal' + language.lang_code + '_code'">Introduce el código
                                                    del literal</label>
                                                <input type="text" class="text" maxlength="1000"
                                                    :id="'literal_' + language.lang_code + '_code'"
                                                    :name="'literal_' + language.lang_code + '_code'"
                                                    v-model="literals['literal_' + language.lang_code].code" required>
                                                <label :for="'literal_' + language.lang_code + '_content'">Introduce el
                                                    contenido del literal</label>
                                                <textarea class="textarea"
                                                    :id="'literal_' + language.lang_code + '_content'"
                                                    :name="'literal_' + language.lang_code + '_content'"
                                                    v-model="literals['literal_' + language.lang_code].content"
                                                    @keypress.enter="handleTextAreaEnter('literal_' + language.lang_code + '_code', $event)"
                                                    required></textarea>
                                            </div>
                                        </div>
                                    </transition>
                                </div>
                            </fieldset>
                            <span v-else>No hay traducciones</span>
                            <button type="submit" id="submit">Guardar</button>
                        </form>
                    </div>
                </div>
                <br>
            </div>
        </div>
    </div>
</template>

<script>
import axios from "axios";
const API_URL = "/api";

export default {
    name: 'home',
    data() {
        return {
            currentLanguage: 'es',
            languages: [],
            pages: [],
            sections: [],
            selectedPageId: null,
            selectedSectionId: null,
            literals: {}
        }
    },
    computed: {
        filteredSections() {
            // Filter the sections based on the selectedPageId
            return this.sections.filter(section => section.app_page_id === this.selectedPageId);
        },
    },
    watch: {
        selectedPageId(newValue) {
            // Find the first section that matches the new page selection
            const firstSection = this.filteredSections.find(section => section.app_page_id === newValue);

            // Update the selectedSectionId with the first section's ID
            if (firstSection) {
                this.selectedSectionId = firstSection.id;
            }
        }
    },
    methods: {
        changeLanguageFields(lang) {
            this.currentLanguage = lang;
        },
        handleTextAreaEnter(modelName, event) {
            if (event.keyCode === 13) {
                event.preventDefault(); // Prevent form submission

                // Get the corresponding v-model property and textarea element
                const model = this[modelName];
                const textarea = event.target;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;

                // Insert a newline character ('\n') at the current cursor position
                this[modelName] =
                    model.substring(0, start) + '\n' + model.substring(end);

                // Move the cursor to the position just after the inserted newline
                const newCursorPosition = start + 1;
                textarea.setSelectionRange(newCursorPosition, newCursorPosition);
            }
        },
        checkForm() {
            if (this.page == '') {
                return false;
            }
            if (this.section == '') {
                return false;
            }
            if (!this.literals) {
                return false;
            } else {
                for (const languageKey of Object.keys(this.literals)) {
                    if (languageKey == '') {
                        return false;
                    }
                    const languageObject = this.literals[languageKey];
                    for (const propertyName of Object.keys(languageObject)) {
                        const propertyValue = languageObject[propertyName];
                        // Do something with the property name and value
                        if (propertyName == '' || propertyValue == '') {
                            return false;
                        }
                        // console.log(`Language: ${languageKey}, Property: ${propertyName}, Value: ${propertyValue}`);
                    }
                }
            }
            return true;
        },
        onSubmit() {
            // console.log(this.page, this.section, this.literal_es, this.literal_en, this.literal_ca, this.literal_de)
            if (this.checkForm()) {
                let data = {
                    page: this.selectedPageId,
                    section: this.selectedSectionId,
                    literals: this.literals
                }
                console.log(data)
                axios.post(API_URL + '/translations/create', data).then(res => {
                    alert(res.data.message)
                }).catch(err => {
                    if (err && err.response && err.response.data) {
                        alert('Ha ocurrido un error realizando la inserción: ' + err.response.data.message)
                    }
                }
                )
                // this.resetForm();
            } else {
                alert('Debes rellenar todos los literales en todos los idiomas')
            }
        }
    },
    mounted() {
        const languagesPromise = axios.get(API_URL + '/languages');
        const pagesPromise = axios.get(API_URL + '/pages');
        const sectionsPromise = axios.get(API_URL + '/sections');

        // Wait for all the requests to complete
        Promise.all([languagesPromise, pagesPromise, sectionsPromise]).then(responses => {
            // Get the data from the responses
            const languages = responses[0].data.data;
            const pages = responses[1].data.data;
            const sections = responses[2].data.data;

            // Iterate over the sections and check if they exist and have a length greater than 0
            if (sections && sections.length > 0) {
                for (const section of sections) {
                    // Iterate over the pages and get the page.name
                    if (pages && pages.length > 0) {
                        for (const page of pages) {
                            // Append the page.name to the section.app_page_id
                            if (section.app_page_id == page.id) {
                                section.page_name = page.app_page_name;
                            }
                        }
                    }
                }
            }

            this.languages = languages;
            this.pages = pages;
            this.sections = sections;

            // Generate the literals object based on the available languages
            const literals = {};
            for (const language of languages) {
                const langCode = language.lang_code;
                literals[`literal_${langCode}`] = {
                    code: '',
                    content: '',
                };
            }
            this.literals = literals;

            // Default form values
            if (this.pages.length > 0) {
                this.selectedPageId = this.pages[0].id;
            }
            if (this.filteredSections.length > 0) {
                this.selectedSectionId = this.filteredSections[0].id;
            }
        }).catch(err => console.error(err))
    }
}
</script>
<style lang="scss" scoped>
.card {
    min-height: 80vh;
}

.card-body {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    h2 {
        width: 100%;
        display: flex;
        justify-content: center;
    }

    >span {
        width: 100%;
        display: flex;
        justify-content: center;
    }
}

#form {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.myRow {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    div {
        margin-left: 10px;
    }
}

.literal {
    display: flex;
    flex-direction: column;

    .textarea {
        width: 600px;
        height: 200px;
    }
}

fieldset {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    legend {
        float: none;
        text-align: center;
    }
}

.btn-selected {
    background-color: blue;
}

#submit {
    margin-top: 24px;
    border-radius: 6px;
}

@media screen and (max-width: 400px) {
    .myRow {
        flex-direction: column;

        div {
            margin-left: 0;
            margin-bottom: 8px;
        }
    }
}
</style>
