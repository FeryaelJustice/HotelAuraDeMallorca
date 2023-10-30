<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory;
    protected $table = 'section';
    protected $primaryKey = 'id';
    protected $fillable = [
        'app_page_id',
        'section_name',
        'section_parent',
    ];
}
