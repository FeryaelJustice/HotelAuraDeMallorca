<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use App\Models\Literal;
use App\Models\Section;
use App\Models\Page;

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
                $literalObj->section_id = $section->id;
                $literalObj->page_id = $page->id;
                // $auxLiteral = Literal::where('code', $literal["code"])->first();
                // if ($auxLiteral && $auxLiteral->id) {
                //     return Response::json(['status' => '404', 'message' => 'You cannot put a literal code that is existing'], 400);
                // }
                $literalObj->save();
            }

            return Response::json(['status' => 'success', 'message' => 'Success!'], 200);
        } catch (\Exception $e) {
            return Response::json(['status' => '404', 'message' => $e], 400);
        }
    }

    public function getPageLiterals($pageId){
        $literals = Literal::where('page_id', $pageId)->orderBy('id')->get();
        return Response::json(['status' => 'success', 'data' => $literals], 200);
    }

    public function getSectionLiterals($pageId, $sectionId)
    {
        $literals = Literal::where('section_id', $sectionId)->where('page_id', $pageId)->orderBy('id')->get();
        return Response::json(['status' => 'success', 'data' => $literals], 200);
    }

    public function updateTranslation(Request $request)
    {
        try {
            Literal::where('id', $request->id)->update(['code' => $request->code, 'content' => $request->content, 'lang_code' => $request->lang_code, 'section_id' => $request->section_id, 'page_id' => $request->page_id]);
            return Response::json(['status' => 'success', 'message' => 'Updated successfully'], 200);
        } catch (\Exception $e) {
            return Response::json(['status' => 'error', 'error' => $e], 500);
        }
    }
}
