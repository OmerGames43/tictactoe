FROM php:8.2-apache

# تمكين صلاحيات الكتابة لإنشاء ملفات الغرف
RUN chmod -R 777 /var/www/html

# تغيير منفذ Apache ليتوافق مع Railway
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

COPY . /var/www/html/

EXPOSE 80
