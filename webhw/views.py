from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from frontend.models import Preference

@csrf_exempt
def save_preferences(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')
            preferred_gender = data.get('preferred_gender', 'all')
            tags = data.get('tags', [])

            # 儲存偏好設定到資料庫
            # preference, created = Preference.objects.update_or_create(
            #     user_id=user_id,
            #     defaults={
            #         'preferred_gender': preferred_gender,
            #         'tags': tags
            #     }
            # )

            return JsonResponse({'message': 'Preferences saved successfully!'}, status=200)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    return JsonResponse({'error': 'Invalid request method'}, status=405)