<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Formulario de gestor de traducciones para tu web</div>

                    <div class="card-body">
                        <h2>Administra tus traducciones</h2>
                        <span><em>Tienes que poner los nombres de la página y seccion exactamente igual a como los utilizas
                                en el código de tu web.</em></span>
                        <form action="" id="form" @submit.prevent="onSubmit">
                            <fieldset>
                                <legend>Página</legend>
                                <label for="pagename">Nombre de la página</label>
                                <input type="text" maxlength="100" id="pagename" name="pagename" v-model="page" list="pages"
                                    required>
                                <datalist id="pages">
                                    <option v-for="page in pages" :key="page.id" :value="page.app_page_name"></option>
                                </datalist>
                            </fieldset>
                            <fieldset>
                                <legend>Sección</legend>
                                <label for="pagesection">Sección de la página</label>
                                <input type="text" maxlength="200" id="pagesection" name="pagesection" v-model="section"
                                    list="sections" required>
                                <datalist id="sections">
                                    <option v-for="section in sections" :key="section.id"
                                        :value="section.page_name + ' - ' + section.section_name">
                                    </option>
                                </datalist>
                            </fieldset>
                            <fieldset v-if="languages && languages[0]">
                                <legend>Traducciones</legend>
                                <div class="languageSelect">
                                    <div class="myRow">
                                        <div v-for="language in languages" :key="language.lang_code">
                                            <button type="button" class="btn btn-dark btn-space"
                                                @click="changeLanguageFields(language.lang_code)">{{
                                                    language.lang_name }}</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="language-selection" v-for="language in languages" :key="language.lang_code">
                                    <transition name="fade">
                                        <div v-if="language.lang_code == currentLanguage">
                                            <div v-if="language.lang_code === 'es'">
                                                <br>
                                                <span>ESPAÑOL - </span>
                                                <label for="literal_es"></label>
                                                <input type="textarea" maxlength="100000" id="literal_es" name="literal_es"
                                                    v-model="literal_es" required>
                                            </div>
                                            <div v-else-if="language.lang_code === 'en'">
                                                <br>
                                                <span>ENGLISH - </span>
                                                <label for="literal_en"></label>
                                                <input type="textarea" maxlength="100000" id="literal_en" name="literal_en"
                                                    v-model="literal_en" required>
                                            </div>
                                            <div v-else-if="language.lang_code === 'ca'">
                                                <br>
                                                <span>CATALAN - </span>
                                                <label for="literal_ca"></label>
                                                <input type="textarea" maxlength="100000" id="literal_ca" name="literal_ca"
                                                    v-model="literal_ca" required>
                                            </div>
                                            <div v-else-if="language.lang_code === 'de'">
                                                <br>
                                                <span>GERMAN - </span>
                                                <label for="literal_de"></label>
                                                <input type="textarea" maxlength="100000" id="literal_de" name="literal_de"
                                                    v-model="literal_de" required>
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
import { LanguagesEnum } from "./../util/enums";
const API_URL = "/api";
export default {
    name: 'home',
    data() {
        return {
            currentLanguage: 'es',
            LanguagesEnum,
            languages: [],
            pages: [],
            sections: [],
            page: '',
            section: '',
            literal_es: '',
            literal_en: '',
            literal_ca: '',
            literal_de: '',
        }
    },
    methods: {
        changeLanguageFields(lang) {
            this.currentLanguage = lang;
        },
        resetForm() {
            this.page = '';
            this.section = '';
            this.literal_es = '';
            this.literal_en = '';
            this.literal_ca = '';
            this.literal_de = '';
        },
        onSubmit() {
            // console.log(this.page, this.section, this.literal_es, this.literal_en, this.literal_ca, this.literal_de)
            let data = {
                page: this.page,
                section: this.section,
                literals: {
                    literal_es: this.literal_es,
                    literal_en: this.literal_en,
                    literal_ca: this.literal_ca,
                    literal_de: this.literal_de
                }
            }
            axios.post(API_URL + '/translations/create', data).then(res => {
                alert(res.data.message)
            }).catch(err => {
                console.error(err)
                alert('Ha ocurrido un error realizando la inserción')
            }
            )
            this.resetForm();
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
            console.log(pages)
            console.log(sections)

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
            console.log(sections)
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
