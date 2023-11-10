<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use App\Models\Literal;
use App\Models\Section;
use App\Models\Page;
// use App\Models\PageLang;
// use App\Models\Lang;
use Illuminate\Support\Facades\DB;

class TranslationsController extends Controller
{
    public function getAllTranslations()
    {
        $literals = Literal::all();
        return Response::json(['status' => 'success', 'data' => $literals], 200);
    }

    public function createTranslation(Request $request)
    {
        try {
            $postData = $request->all();
            $page = Page::where('id', $postData['page'])->first();
            $section = Section::where('id', $postData['section'])->first();

            if (!$page) {
                // If we want to only create pages that exist
                return Response::json(['status' => '404', 'message' => 'Page not found'], 400);

                /*
                // Create a new page
                $newPage = new Page();
                $newPage->app_page_name = $postData['page'];
                $newPage->save();

                // Create page available langs
                $langs = Lang::all();
                foreach ($langs as $lang) {
                    $newPageLang = new PageLang();
                    $newPageLang->app_page_id = $newPage->id;
                    $newPageLang->lang_id = $lang->id;
                    $newPageLang->save();
                }
                */
            }

            if (!$section) {
                // If we want to only create sections that exist
                return Response::json(['status' => '404', 'message' => 'Section not found'], 400);

                /*
                // Create a new section
                $newSection = new Section();
                $newSection->app_page_id = $newPage->id;
                $newSection->section_name = $postData['section'];
                $newSection->section_parent = null;
                $newSection->save();
                */
            }

            $literals = $postData['literals'];
            foreach ($literals as $literal) {
                $literalObj = new Literal();
                $literalObj->code = $literal["code"];
                $literalObj->content = $literal["content"];
                $literalObj->lang_code = $literal["lang_code"];
                $auxLiteral = Literal::where('code', $literal["code"])->first();
                if ($auxLiteral && $auxLiteral->id) {
                    return Response::json(['status' => '404', 'message' => 'You cannot put a literal code that is existing'], 400);
                }
                $literalObj->save();
                $literalID = $literalObj->id;
                // Check if $section exists before inserting into the section_literal table

                if ($literalObj) {
                    // if (!$section) {
                    //    DB::table('section_literal')->insert(['section_id' => $newSection->id, 'literal_id' => $literalID]);
                    // } else {
                    DB::table('section_literal')->insert(['section_id' => $section["id"], 'literal_id' => $literalID]);
                    // }
                }
            }

            return Response::json(['status' => 'success', 'message' => 'Success!'], 200);
        } catch (\Exception $e) {
            return Response::json(['status' => '404', 'message' => `Error inserting a translation`], 400);
        }
    }

    public function getSectionLiterals($sectionId)
    {
        $literals = DB::select("SELECT * FROM section_literal sl INNER JOIN literal l ON l.id=sl.literal_id WHERE sl.section_id=?", [$sectionId]);
        return Response::json(['status' => 'success', 'data' => $literals], 200);
    }

    public function updateTranslation(Request $request)
    {
        try {
            Literal::where('id', $request->id)->update(['code' => $request->code, 'content' => $request->content, 'lang_code' => explode('_', $request->code)[1]]);
            return Response::json(['status' => 'success', 'message' => 'Updated successfully'], 200);
        } catch (\Exception $e) {
            return Response::json(['status' => 'error', 'error' => $e], 500);
        }
    }
}
