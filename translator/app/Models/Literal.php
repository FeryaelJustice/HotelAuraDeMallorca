<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Literal extends Model
{
    use HasFactory;
    protected $table = 'literal';
    protected $primaryKey = 'id';
    protected $fillable = [
        'code',
        'content',
        'lang_code',
        'section_id',
        'page_id'
    ];
}
