<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use App\Models\Section;

class SectionController extends Controller
{
    public function getSections()
    {
        $sections = Section::orderBy("section_name")->get();
        return Response::json(['status' => 'success', 'data' => $sections], 200);
    }

    public function getSection($id)
    {
        $section = Section::find($id);
        return Response::json(['status' => 'success', 'data' => $section], 200);
    }

    public function createSection(Request $request){
        try {
            $data = $request->all()["data"];
            $newSection = new Section();
            $newSection->page_id = $data['pageID'];
            $newSection->section_name = $data['newSectionName'];
            $newSection->section_parent = null;
            $newSection->save();
            return Response::json(['status' => 'success', 'message' => 'Success!'], 200);
        } catch (\Throwable $th) {
            return Response::json(['status' => 'error', 'message' => $th], 500);
        }
    }

    public function getPageSections($pageId)
    {
        $sections = Section::where('page_id', $pageId)->get();
        return Response::json(['status' => 'success', 'data' => $sections], 200);
    }
}
